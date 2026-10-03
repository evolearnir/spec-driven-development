import { parentPort, workerData } from "node:worker_threads";
import { openDatabase } from "../../src/db/connection.js";
import { policies } from "../../src/services/policies.js";
import { AppError } from "../../src/services/errors.js";

const db = await openDatabase(workerData.filename);
const gate = new Int32Array(workerData.gate);
parentPort!.postMessage("ready");
Atomics.wait(gate, 0, 0);
try {
  await policies(db).changeAccount(workerData.id, workerData.id, {
    operation: "update",
    role: "user",
  });
  parentPort!.postMessage("changed");
} catch (error) {
  parentPort!.postMessage(
    error instanceof AppError && error.status === 409 ? "protected" : "failed",
  );
} finally {
  await db.$disconnect();
}
