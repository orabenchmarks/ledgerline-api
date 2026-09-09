import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 3000);
createApp({ dataPath: process.env.DATA_PATH ?? "data/ledger.json", keysPath: process.env.KEYS_PATH ?? "data/keys.json" }).listen(port, () => {
  console.log(`ledgerline listening on :${port}`);
});
