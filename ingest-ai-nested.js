import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { AzureMonitorLogExporter } from "@azure/monitor-opentelemetry-exporter";
import { LoggerProvider, SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { logs } from "@opentelemetry/api-logs";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { context, trace } from "@opentelemetry/api";
import { MEDIUM_MESSAGE_NESTED } from './message.js';


diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

const provider = new NodeTracerProvider();
const exporter = new AzureMonitorLogExporter({
  connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
});

const logRecordProcessor = new SimpleLogRecordProcessor(exporter);
const loggerProvider = new LoggerProvider({
  processors: [logRecordProcessor],
});

// Register logger Provider as global
logs.setGlobalLoggerProvider(loggerProvider);
provider.register()

const message = MEDIUM_MESSAGE_NESTED // MEDIUM_MESSAGE

async function main() {
  const logger = logs.getLogger("example-logger");

  // flatten properties up to 100 properties / attributes
  // @type LogRecord
  console.log("Ingestion AppInsight message length", JSON.stringify(message).length)

  const tracer = trace.getTracer("example-tracer");
  const span = tracer.startSpan("StartSpan"); // root span for the operation
  await context.with(trace.setSpan(context.active(), span), async () => {
    // This log will carry the active span’s traceId/spanId
    logger.emit(message)
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
