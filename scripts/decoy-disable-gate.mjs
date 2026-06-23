import { printStatus, updateControl, writeAuditLog } from "./decoy-lib.mjs";

const updatedControl = await updateControl({
  gate_enabled: false,
  gate_token_hash: null,
  updated_by: "local-script",
});

await writeAuditLog("decoy_gate_disabled", {
  tokenVersion: updatedControl.token_version,
});

printStatus(updatedControl);
