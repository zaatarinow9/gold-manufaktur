import { hashValue, parseCliArgs } from "./decoy-lib.mjs";

const args = parseCliArgs(process.argv.slice(2));
const value = args.positional[0] ?? "";

if (!value.trim()) {
  console.error('Usage: npm run decoy:hash -- "PIN_HERE"');
  process.exit(1);
}

console.log(hashValue(value));
