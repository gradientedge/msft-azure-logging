import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { AzureMonitorLogExporter } from "@azure/monitor-opentelemetry-exporter";
import { LoggerProvider, SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { logs } from "@opentelemetry/api-logs";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { context, trace } from "@opentelemetry/api";
import { DefaultAzureCredential } from "@azure/identity";
import { LogsIngestionClient } from "@azure/monitor-ingestion";
import { MEDIUM_MESSAGE, LARGE_MESSAGE } from './message.js';

const endpoint = process.env.LOGS_INGESTION_ENDPOINT;
const ruleId = process.env.DCR_RULE_ID;
const streamName = process.env.STREAM_NAME;
const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

const provider = new NodeTracerProvider();
const exporter = new AzureMonitorLogExporter({ connectionString });

const logRecordProcessor = new SimpleLogRecordProcessor(exporter);
const loggerProvider = new LoggerProvider({ processors: [logRecordProcessor] });

// Register logger Provider as global
logs.setGlobalLoggerProvider(loggerProvider);
provider.register()

const credential = new DefaultAzureCredential();
const client = new LogsIngestionClient(endpoint, credential);

async function main() {
  const logger = logs.getLogger("example-logger");

  // flatten properties up to 100 properties / attributes
  // @type LogRecord
  console.log("Ingestion AppInsight message length", JSON.stringify(MEDIUM_MESSAGE).length)

  const tracer = trace.getTracer("example-tracer");
  const span = tracer.startSpan("StartSpan"); // root span for the operation
  await context.with(trace.setSpan(context.active(), span), async () => {
    // This log will carry the active span’s traceId/spanId
    logger.emit(MEDIUM_MESSAGE)
    const traceId = span.spanContext().traceId
    const batch = [{ ...LARGE_MESSAGE, OperationId: traceId }]
    console.log("🚀 Ingesting logs... size", JSON.stringify(batch).length, "bytes");
    await client.upload(ruleId, streamName, batch);
    console.log("OperationId:", span.spanContext().traceId)
    span.end();
  })

  console.log('emitted log')
  await exporter.shutdown()
}

await main().catch((err) => {
  console.error("❌ Ingestion failed:", err);
  process.exit(1);
})
