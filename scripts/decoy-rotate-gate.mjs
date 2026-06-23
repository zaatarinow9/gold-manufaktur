import {
  buildGateUrl,
  createGateToken,
  getAuditRecipientTarget,
  hashValue,
  parseCliArgs,
  printStatus,
  readControl,
  resolveRotateExpiry,
  sendAdminSystemAccessEmail,
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
const fullUrl = buildGateUrl(args.locale, token);
let emailSent = false;
let emailStatus = "skipped";
let emailReason = "";
let emailRecipientTarget = "";

if (args.email) {
  const emailResult = await sendAdminSystemAccessEmail({
    expiresAt,
    link: fullUrl,
  });

  emailSent = emailResult.status === "sent";
  emailStatus = emailResult.status;
  emailReason = emailResult.reason ?? "";
  emailRecipientTarget = getAuditRecipientTarget(emailResult.recipientEmail);
}

await writeAuditLog("gate_rotated", {
  emailAttempted: args.email,
  emailSent,
  emailStatus,
  expiresAt,
  locale: args.locale,
  recipientTarget: emailRecipientTarget || null,
  tokenVersion: nextTokenVersion,
});

printStatus(updatedControl);
console.log(`email_status=${emailStatus}`);
if (emailReason) {
  console.log(`email_reason=${emailReason}`);
}
console.log(`full_url=${fullUrl}`);
