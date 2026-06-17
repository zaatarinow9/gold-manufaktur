import "server-only";

import net from "node:net";
import os from "node:os";
import tls from "node:tls";
import { once } from "node:events";

export type SmtpTransportConfig = {
  from: string;
  host: string;
  password: string;
  port: number;
  rejectUnauthorized: boolean;
  secure: boolean;
  user: string;
};

export type SmtpSendOptions = {
  html?: string;
  replyTo?: string;
  subject: string;
  text: string;
  to: string[];
};

type SmtpResponse = {
  code: number;
  lines: string[];
  message: string;
};

class SmtpLineReader {
  private buffer = "";
  private pending: Array<{
    reject: (error: Error) => void;
    resolve: (line: string) => void;
  }> = [];
  private queued: string[] = [];

  constructor(private readonly socket: net.Socket | tls.TLSSocket) {
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string | Buffer) => {
      this.pushChunk(typeof chunk === "string" ? chunk : chunk.toString("utf8"));
    });
    socket.on("error", (error) => {
      this.rejectAll(error instanceof Error ? error : new Error(String(error)));
    });
    socket.on("close", () => {
      this.rejectAll(new Error("SMTP connection closed."));
    });
  }

  async nextLine() {
    if (this.queued.length > 0) {
      return this.queued.shift()!;
    }

    return new Promise<string>((resolve, reject) => {
      this.pending.push({ reject, resolve });
    });
  }

  private pushChunk(chunk: string) {
    this.buffer += chunk;

    while (true) {
      const delimiterIndex = this.buffer.indexOf("\r\n");

      if (delimiterIndex === -1) {
        break;
      }

      const line = this.buffer.slice(0, delimiterIndex);
      this.buffer = this.buffer.slice(delimiterIndex + 2);

      if (this.pending.length > 0) {
        this.pending.shift()!.resolve(line);
      } else {
        this.queued.push(line);
      }
    }
  }

  private rejectAll(error: Error) {
    while (this.pending.length > 0) {
      this.pending.shift()!.reject(error);
    }
  }
}

function encodeHeaderValue(value: string) {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function dotStuff(value: string) {
  return value
    .replace(/\r?\n/g, "\r\n")
    .split("\r\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
}

function parseCapabilities(response: SmtpResponse) {
  return response.lines
    .map((line) => line.slice(4).trim().toUpperCase())
    .filter(Boolean);
}

async function openSocket(config: SmtpTransportConfig) {
  const socket = config.secure
    ? tls.connect({
        host: config.host,
        port: config.port,
        rejectUnauthorized: config.rejectUnauthorized,
        servername: config.host,
      })
    : net.connect({
        host: config.host,
        port: config.port,
      });

  await once(socket, config.secure ? "secureConnect" : "connect");

  return socket;
}

async function readResponse(reader: SmtpLineReader): Promise<SmtpResponse> {
  const lines: string[] = [];

  while (true) {
    const line = await reader.nextLine();
    lines.push(line);

    if (/^\d{3} /.test(line)) {
      return {
        code: Number(line.slice(0, 3)),
        lines,
        message: lines.join("\n"),
      };
    }
  }
}

async function sendCommand(
  socket: net.Socket | tls.TLSSocket,
  reader: SmtpLineReader,
  command: string,
  expectedCodes: number[]
) {
  socket.write(`${command}\r\n`);
  const response = await readResponse(reader);

  if (!expectedCodes.includes(response.code)) {
    throw new Error(
      `SMTP command failed (${command.split(" ")[0]}): ${response.message}`
    );
  }

  return response;
}

async function upgradeToTls(
  socket: net.Socket | tls.TLSSocket,
  config: SmtpTransportConfig
) {
  const tlsSocket = tls.connect({
    host: config.host,
    rejectUnauthorized: config.rejectUnauthorized,
    servername: config.host,
    socket,
  });

  await once(tlsSocket, "secureConnect");

  return tlsSocket;
}

async function sayHello(
  socket: net.Socket | tls.TLSSocket,
  reader: SmtpLineReader
) {
  const ehloHost =
    os.hostname().replace(/[^a-z0-9.-]/gi, "").trim() || "localhost";

  return sendCommand(socket, reader, `EHLO ${ehloHost}`, [250]);
}

async function authenticate(
  socket: net.Socket | tls.TLSSocket,
  reader: SmtpLineReader,
  capabilities: string[],
  config: SmtpTransportConfig
) {
  const authLine = capabilities.find((line) => line.startsWith("AUTH")) ?? "";

  if (authLine.includes("PLAIN")) {
    const payload = Buffer.from(`\0${config.user}\0${config.password}`, "utf8").toString(
      "base64"
    );
    await sendCommand(socket, reader, `AUTH PLAIN ${payload}`, [235]);
    return;
  }

  await sendCommand(socket, reader, "AUTH LOGIN", [334]);
  await sendCommand(
    socket,
    reader,
    Buffer.from(config.user, "utf8").toString("base64"),
    [334]
  );
  await sendCommand(
    socket,
    reader,
    Buffer.from(config.password, "utf8").toString("base64"),
    [235]
  );
}

function buildMimeMessage(config: SmtpTransportConfig, input: SmtpSendOptions) {
  const toHeader = input.to.join(", ");
  const headers = [
    `From: ${config.from}`,
    `To: ${toHeader}`,
    `Subject: ${encodeHeaderValue(input.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
  ];

  if (input.replyTo) {
    headers.push(`Reply-To: ${input.replyTo}`);
  }

  if (!input.html) {
    headers.push('Content-Type: text/plain; charset="utf-8"');
    headers.push("Content-Transfer-Encoding: 8bit");

    return `${headers.join("\r\n")}\r\n\r\n${dotStuff(input.text)}\r\n`;
  }

  const boundary = `goldhelwah-${crypto.randomUUID()}`;

  headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);

  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="utf-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    dotStuff(input.text),
    `--${boundary}`,
    'Content-Type: text/html; charset="utf-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    dotStuff(input.html),
    `--${boundary}--`,
    "",
  ].join("\r\n");

  return `${headers.join("\r\n")}\r\n\r\n${body}`;
}

export async function sendViaSmtp(
  config: SmtpTransportConfig,
  input: SmtpSendOptions
) {
  let socket = await openSocket(config);
  let reader = new SmtpLineReader(socket);

  try {
    const greeting = await readResponse(reader);

    if (greeting.code !== 220) {
      throw new Error(`SMTP server rejected connection: ${greeting.message}`);
    }

    let helloResponse = await sayHello(socket, reader);
    let capabilities = parseCapabilities(helloResponse);

    if (!config.secure && capabilities.some((line) => line.startsWith("STARTTLS"))) {
      await sendCommand(socket, reader, "STARTTLS", [220]);
      socket = await upgradeToTls(socket, config);
      reader = new SmtpLineReader(socket);
      helloResponse = await sayHello(socket, reader);
      capabilities = parseCapabilities(helloResponse);
    }

    await authenticate(socket, reader, capabilities, config);
    await sendCommand(socket, reader, `MAIL FROM:<${config.from}>`, [250]);

    for (const recipient of input.to) {
      await sendCommand(socket, reader, `RCPT TO:<${recipient}>`, [250, 251]);
    }

    await sendCommand(socket, reader, "DATA", [354]);
    socket.write(`${buildMimeMessage(config, input)}\r\n.\r\n`);

    const dataResponse = await readResponse(reader);

    if (dataResponse.code !== 250) {
      throw new Error(`SMTP DATA failed: ${dataResponse.message}`);
    }

    await sendCommand(socket, reader, "QUIT", [221]);
  } finally {
    socket.destroy();
  }
}
