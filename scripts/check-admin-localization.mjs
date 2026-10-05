import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const roots = ["src/app/[locale]/admin", "src/components/admin", "src/lib/admin"];
const extensions = new Set([".ts", ".tsx"]);
const forbiddenMarkers = ["\u00c3", "\u00c2", "\ufffd"];
const issues = [];

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await visit(file);
    else if (extensions.has(path.extname(entry.name))) {
      const text = await readFile(file, "utf8");
      if (forbiddenMarkers.some((marker) => text.includes(marker))) {
        issues.push(`${file}: mojibake marker in admin source`);
      }
    }
  }
}

await Promise.all(roots.map(visit));
if (issues.length) {
  console.error("Admin localization check failed:\n" + issues.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Admin localization check passed.");
}
