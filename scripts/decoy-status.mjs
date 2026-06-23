import { printStatus, readControl } from "./decoy-lib.mjs";

printStatus(await readControl());
