// Verifies that every static translation key used in the code exists in all
// message files. Catches typos and keys that were never added, which
// next-intl would otherwise render as the raw key path on screen.
//
// Recognised bindings (scope-aware, via the TypeScript parser):
//   const t = useTranslations("Admin.products");
//   const t = await getTranslations({ locale, namespace: "Admin" });
//   const t = await getTranslations("Admin");
// Calls: t("key"), t.rich("key"), t(`status.${value}`) (checks "status" is an object).
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const locales = ["de", "ar", "en", "fr", "tr"];
const messages = Object.fromEntries(
  await Promise.all(
    locales.map(async (locale) => [
      locale,
      JSON.parse(await readFile(path.join(root, "messages", `${locale}.json`), "utf8")),
    ])
  )
);

const lookup = (obj, dotted) =>
  dotted.split(".").reduce((node, part) => (node && typeof node === "object" ? node[part] : undefined), obj);

async function* walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "zz-preview"].includes(entry.name) || entry.name.startsWith(".")) continue;
      yield* walk(file);
    } else if (/\.tsx?$/.test(entry.name)) {
      yield file;
    }
  }
}

function namespaceOf(initializer) {
  let node = initializer;
  if (node && ts.isAwaitExpression(node)) node = node.expression;
  if (!node || !ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) return null;
  if (!["useTranslations", "getTranslations"].includes(node.expression.text)) return null;
  const [arg] = node.arguments;
  if (!arg) return "";
  if (ts.isStringLiteral(arg)) return arg.text;
  if (ts.isObjectLiteralExpression(arg)) {
    const prop = arg.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText() === "namespace");
    if (prop && ts.isStringLiteral(prop.initializer)) return prop.initializer.text;
    if (!prop) return "";
  }
  return null; // dynamic namespace: skip
}

const problems = new Set();
let checked = 0;

for await (const file of walk(path.join(root, "src"))) {
  const text = await readFile(file, "utf8");
  if (!/useTranslations|getTranslations/.test(text)) continue;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const scopes = [new Map()];

  const visit = (node) => {
    const opensScope = ts.isFunctionLike(node) || ts.isBlock(node) || ts.isSourceFile(node);
    if (opensScope) scopes.push(new Map());

    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const ns = namespaceOf(node.initializer);
      if (ns !== null) scopes[scopes.length - 1].set(node.name.text, ns);
    }

    if (ts.isCallExpression(node)) {
      let callee = node.expression;
      let isRaw = false;
      if (ts.isPropertyAccessExpression(callee) && ["rich", "raw", "markup", "has"].includes(callee.name.text)) {
        isRaw = callee.name.text === "raw" || callee.name.text === "has";
        callee = callee.expression;
      }
      const [arg] = node.arguments;
      if (ts.isIdentifier(callee) && arg) {
        let ns;
        for (let i = scopes.length - 1; i >= 0; i -= 1) {
          if (scopes[i].has(callee.text)) {
            ns = scopes[i].get(callee.text);
            break;
          }
        }
        if (ns !== undefined) {
          let key = null;
          let isPrefix = false;
          if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) key = arg.text;
          else if (ts.isTemplateExpression(arg)) {
            key = arg.head.text.replace(/\.$/, "");
            isPrefix = true;
          }
          if (key) {
            const full = ns ? `${ns}.${key}` : key;
            checked += 1;
            for (const locale of locales) {
              const value = lookup(messages[locale], full);
              const ok = isRaw
                ? value !== undefined
                : isPrefix
                  ? value && typeof value === "object"
                  : typeof value === "string";
              if (!ok) {
                const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
                problems.add(`${path.relative(root, file)}:${line + 1} ${locale} ${full}${isPrefix ? ".*" : ""}`);
              }
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
    if (opensScope) scopes.pop();
  };

  visit(sf);
}

if (problems.size > 0) {
  console.error([...problems].join("\n"));
  console.error(`\n${problems.size} missing translation(s) in ${checked} checked calls.`);
  process.exitCode = 1;
} else {
  console.log(`Translation usage check passed (${checked} calls).`);
}
