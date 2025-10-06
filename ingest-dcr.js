import { DefaultAzureCredential } from "@azure/identity";
import { LogsIngestionClient } from "@azure/monitor-ingestion";
import { LARGE_MESSAGE } from "./message.js";

const endpoint = process.env.LOGS_INGESTION_ENDPOINT;
const ruleId = process.env.DCR_RULE_ID;
const streamName = process.env.STREAM_NAME;

async function main() {
  const credential = new DefaultAzureCredential();

  // For sovereign clouds, pass { audience: "<cloud-audience>" } in options.
  const client = new LogsIngestionClient(endpoint, credential);

  // Records should match the DCR input schema (or be mapped by the DCR transform)
  const batch = [LARGE_MESSAGE];

  console.log("🚀 Ingesting logs... size", JSON.stringify(batch).length, "bytes");
  await client.upload(ruleId, streamName, batch);
  console.log("✅ Uploaded");
}

main().catch((err) => {
  console.error("❌ Ingestion failed:", err);
  process.exit(1);
});
