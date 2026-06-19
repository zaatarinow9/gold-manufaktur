import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const messagesDir = path.join(rootDir, "messages");
const baseLocale = "de";
const unresolvedKeyPattern =
  /\b(?:Nav|Home|Admin|Tracking|Settings|Inquiries|Orders)\.[A-Za-z0-9_.]+\b/;
const strictKeys = process.argv.includes("--strict-keys");

function flattenKeys(value, prefix = "") {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flattenKeys(item, `${prefix}[${index}]`));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      return flattenKeys(item, nextPrefix);
    });
  }

  return prefix ? [prefix] : [];
}

function collectStringIssues(value, locale, issues, prefix = "") {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectStringIssues(item, locale, issues, `${prefix}[${index}]`)
    );
    return;
  }

  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      collectStringIssues(item, locale, issues, nextPrefix);
    });
    return;
  }

  if (typeof value !== "string") {
    return;
  }

  if (value.includes("???")) {
    issues.push(`${locale}: contains ??? at ${prefix}`);
  }

  if (unresolvedKeyPattern.test(value)) {
    issues.push(`${locale}: unresolved key-like text at ${prefix}: ${value}`);
  }
}

async function main() {
  const files = (await readdir(messagesDir))
    .filter((file) => file.endsWith(".json"))
    .sort();
  const issues = [];
  const warnings = [];
  const payloadByLocale = new Map();

  for (const file of files) {
    const absolutePath = path.join(messagesDir, file);
    const buffer = await readFile(absolutePath);
    const locale = path.basename(file, ".json");

    if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      issues.push(`${locale}: file has a UTF-8 BOM`);
    }

    let parsed;

    try {
      parsed = JSON.parse(buffer.toString("utf8"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown JSON parse error";
      issues.push(`${locale}: invalid JSON (${message})`);
      continue;
    }

    collectStringIssues(parsed, locale, issues);
    payloadByLocale.set(locale, parsed);
  }

  const basePayload = payloadByLocale.get(baseLocale);

  if (!basePayload) {
    issues.push(`Base locale ${baseLocale} is missing.`);
  } else {
    const baseKeys = new Set(flattenKeys(basePayload));

    for (const [locale, payload] of payloadByLocale.entries()) {
      if (locale === baseLocale) {
        continue;
      }

      const localeKeys = new Set(flattenKeys(payload));
      const missingKeys = [...baseKeys].filter((key) => !localeKeys.has(key));

      if (missingKeys.length > 0) {
        const target = strictKeys ? issues : warnings;
        target.push(
          `${locale}: missing ${missingKeys.length} keys compared with ${baseLocale}`
        );
        missingKeys.slice(0, 20).forEach((key) => {
          target.push(`  - ${key}`);
        });
      }
    }
  }

  if (issues.length > 0) {
    console.error("Message integrity check failed.");
    issues.forEach((issue) => console.error(issue));
    process.exitCode = 1;
    return;
  }

  if (warnings.length > 0) {
    console.warn("Message integrity check warnings:");
    warnings.forEach((warning) => console.warn(warning));
  }

  console.log(`Message integrity check passed for ${files.length} locale files.`);
}

await main();
