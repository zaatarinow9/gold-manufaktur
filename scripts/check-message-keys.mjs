import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const messagesDir = path.join(process.cwd(), "messages");
const referenceLocale = "en";

function compare(reference, candidate, locale, prefix = "", issues = []) {
  const referenceType = Array.isArray(reference)
    ? "array"
    : reference !== null && typeof reference === "object"
      ? "object"
      : typeof reference;
  const candidateType = Array.isArray(candidate)
    ? "array"
    : candidate !== null && typeof candidate === "object"
      ? "object"
      : typeof candidate;

  if (referenceType !== candidateType) {
    issues.push(`${locale}: type mismatch at ${prefix} (expected ${referenceType}, got ${candidateType})`);
    return issues;
  }

  if (referenceType === "array") {
    return issues;
  }

  if (referenceType === "object") {
    for (const [key, value] of Object.entries(reference)) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      if (!(key in candidate)) {
        issues.push(`${locale}: missing ${nextPrefix}`);
        continue;
      }
      compare(value, candidate[key], locale, nextPrefix, issues);
    }
  }

  return issues;
}

const files = (await readdir(messagesDir)).filter((file) => file.endsWith(".json")).sort();
const messages = new Map();

for (const file of files) {
  const locale = path.basename(file, ".json");
  messages.set(locale, JSON.parse(await readFile(path.join(messagesDir, file), "utf8")));
}

const reference = messages.get(referenceLocale);
if (!reference) throw new Error(`Reference locale ${referenceLocale} is missing.`);

const issues = [];
for (const [locale, messagesForLocale] of messages) {
  if (locale !== referenceLocale) compare(reference, messagesForLocale, locale, "", issues);
}

if (issues.length > 0) {
  console.error("Message key parity check failed.");
  issues.forEach((issue) => console.error(issue));
  process.exitCode = 1;
} else {
  console.log(`Message key parity check passed for ${files.length} locale files.`);
}
