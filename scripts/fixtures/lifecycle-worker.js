import { parentPort, workerData } from "node:worker_threads";
import { openDatabase } from "../../src/db/connection.js";
import { policies } from "../../src/services/policies.js";

const db = openDatabase(workerData.filename);
const gate = new Int32Array(workerData.gate);
parentPort.postMessage("ready");
Atomics.wait(gate, 0, 0);
try {
  policies(db).changeAccount(workerData.id, workerData.id, {
    operation: "update",
    role: "user",
  });
  parentPort.postMessage("changed");
} catch (error) {
  parentPort.postMessage(error.status === 409 ? "protected" : "failed");
} finally {
  db.close();
}
