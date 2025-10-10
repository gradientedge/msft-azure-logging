import { useAzureMonitor } from "@azure/monitor-opentelemetry";
import { SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { AzureMonitorLogExporter } from "@azure/monitor-opentelemetry-exporter";

// process.env["APPLICATIONINSIGHTS_INSTRUMENTATION_LOGGING_LEVEL"] = "VERBOSE";
// applicationInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING);
// applicationInsights.defaultClient.addTelemetryProcessor(addCustomProperty);
// applicationInsights.start();

// function addCustomProperty(envelope) {
//   const data = envelope.data.baseData;
//   if (data?.properties) {
//     data.properties.customProperty = "Custom Property Value";
//   }
//   return true;
// }
//
class SpanEnrichingProcessor {
  forceFlush() {
    return Promise.resolve();
  }
  onStart(span, parentContext) {
    return;
  }
  onEnd(span) {
    span.attributes["custom-attribute"] = "custom-value";
  }
  shutdown() {
    return Promise.resolve();
  }
}

class LogRecordEnrichingProcessor {
  async forceFlush() {
    // Flush code here
  }
  async shutdown() {
    // shutdown code here
  }
  onEmit(_logRecord, _context) {
    console.log('emiting log')
    const parentSpan = trace.getSpan(_context);
    if (parentSpan && "name" in parentSpan) {
      console.log('parent span', parentSpan)
      // If the parent span has a name we can assume it is a ReadableSpan and cast it.
      // _logRecord.setAttribute(AI_OPERATION_NAME, (parentSpan).name);
    }
  }
}

const exporter = new AzureMonitorLogExporter({
  connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
});

const logRecordProcessor = new SimpleLogRecordProcessor(exporter);
const options = {
  azureMonitorExporterOptions: {
    connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
  },
  spanProcessors: [new SpanEnrichingProcessor()],
  instrumentationOptions: {
    // Instrumentations generating traces
    azureSdk: { enabled: true },
    // Instrumentations generating logs
    bunyan: { enabled: true },
    winston: { enabled: true },
  },
  logRecordProcessors: [new LogRecordEnrichingProcessor(), logRecordProcessor],
};

useAzureMonitor(options);

const winston = await import("winston")

const log = winston.createLogger({
  transports: [new winston.transports.Console()],
});
log.info("order received", { orderId: "A-12345", region: "westeurope" });
