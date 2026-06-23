import {
  buildGateUrl,
  createGateToken,
  hashValue,
  parseCliArgs,
  printStatus,
  readControl,
  resolveRotateExpiry,
  updateControl,
  writeAuditLog,
} from "./decoy-lib.mjs";

const args = parseCliArgs(process.argv.slice(2));
const currentControl = await readControl();
const expiresAt = resolveRotateExpiry(args);
const token = createGateToken();
const tokenHash = hashValue(token);
const rotatedAt = new Date().toISOString();
const nextTokenVersion = Math.max(Number(currentControl.token_version ?? 1), 0) + 1;
const updatedControl = await updateControl({
  expires_at: expiresAt,
  gate_enabled: true,
  gate_token_hash: tokenHash,
  last_rotated_at: rotatedAt,
  token_version: nextTokenVersion,
  updated_by: "local-script",
});

await writeAuditLog("decoy_gate_rotated", {
  expiresAt,
  locale: args.locale,
  tokenVersion: nextTokenVersion,
});

printStatus(updatedControl);
console.log(`full_url=${buildGateUrl(args.locale, token)}`);
