import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const messagesDir = path.join(process.cwd(), "messages");
const replacementCharacter = "\uFFFD";
const arabicMojibakeMarkers = ["\u00D9", "\u00D8", "\u00C3", "\u00C2"];
const commonMojibakeSequences = [
  "\u00C3\u00BC",
  "\u00C3\u009F",
  "\u00C3\u00A9",
  "\u00C3\u00A8",
  "\u00C3\u00AA",
  "\u00C3\u00A7",
  "\u00C2\u00A7",
  "\u00C2\u00AB",
  "\u00C2\u00BB",
];

async function main() {
  const files = (await readdir(messagesDir)).filter((file) => file.endsWith(".json")).sort();
  const issues = [];

  for (const file of files) {
    const buffer = await readFile(path.join(messagesDir, file));
    const text = buffer.toString("utf8");

    if (buffer.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) {
      issues.push(`${file}: UTF-8 BOM detected`);
    }

    if (text.includes(replacementCharacter)) {
      issues.push(`${file}: replacement character detected`);
    }

    for (const sequence of commonMojibakeSequences) {
      if (text.includes(sequence)) {
        issues.push(`${file}: mojibake sequence ${JSON.stringify(sequence)} detected`);
      }
    }

    if (file === "ar.json") {
      for (const marker of arabicMojibakeMarkers) {
        if (text.includes(marker)) {
          issues.push(`${file}: Arabic mojibake marker ${JSON.stringify(marker)} detected`);
        }
      }
    }
  }

  if (issues.length > 0) {
    console.error("Mojibake check failed:\n" + issues.join("\n"));
    process.exitCode = 1;
    return;
  }

  console.log(`Mojibake check passed for ${files.length} locale files.`);
}

await main();
