# AI Custom dimensions vs. DCR custom logs


| Dimension | App Insights custom properties (`customDimensions`) | DCR custom log (`LogsIngestionClient`) |
|-----------|----------------------------------------------------|-----------------------------------------|
| **Best for** | Small, contextual key/values on existing telemetry (traces/requests/dependencies/exceptions). | Ingesting arbitrary JSON logs/events from anywhere (batch jobs, services without AI SDK, external systems). |
| **Data home** | Application Insights tables in the workspace: `traces`, `requests`, `dependencies`, etc. Properties land in `customDimensions` (dynamic). | Your target workspace table (usually a **custom** table like `MyEvents_CL`) defined by the DCR stream & transform. |
| **Per-item size** | ~**64 KB** total telemetry item; **message** up to ~**32 KB**; **each property value** up to ~**8 KB**; **property name** up to ~**150 chars**; ~**100 properties** per item. Items exceeding limits are truncated/dropped by the SDK. | Larger tolerance than AI items; practical limit driven by service caps and HTTP payload chunking. Still keep rows “reasonable” (multi-hundreds of KB can be problematic; prefer links for big payloads). |
| **Schema** | Implicit/dynamic (`customDimensions` is a bag). Great for ad-hoc props; not ideal for strongly typed analytics. | You control schema via DCR transform → stable columns in the table. Easier for typed analytics and governance. |
| **Queryability** | Excellent for correlating with app telemetry; filter by `customDimensions.*`. | Excellent for dedicated log analytics; can **join with AI tables** by correlation IDs, user/session, etc. |
| **Correlation** | Built-in with `operationId`, `spanId`, etc. across requests/dependencies/traces. | Add your own correlation keys (e.g., `operationId`, `traceId`, `orderId`) and join with AI tables. |
| **Throughput** | Very good; subject to SDK batching & sampling. | High throughput via SDK batching/chunking; good for bulk/backfill. |
| **Sampling** | AI SDK can sample (may drop items → fewer rows, lower cost). | No built-in sampling in ingestion; you control what you send. |
| **Transforms** | None on the platform side for `customDimensions`. | Powerful: DCR transform (KQL) can reshape/validate incoming JSON before landing. |
| **Latency** | Low (seconds). | Low to moderate (seconds to low minutes depending on volume/region). |
| **Auth & RBAC** | App Insights connection string/instrumentation key (or exporter creds). | Azure AD (Managed Identity/Service Principal) + **role on the DCR** (and access to workspace). |
| **Cost model** | Billed as part of AI/Log Analytics ingestion for those items. Sampling can reduce volume. | Billed as Log Analytics ingestion for rows you send. You choose what (and how much) to ingest. |
| **Retention** | Workspace retention applies to AI tables. | Workspace retention applies to the custom table. |
| **Ops overhead** | Minimal — just send telemetry with properties. | You maintain DCR + optional DCE + schema/transform lifecycle. |
| **When NOT to use** | Don’t stuff large payloads/blobs; avoid >100 properties or very long values. | Don’t use it to write into AI system tables (e.g., `traces`) — that’s not supported. |


## App Inisght

You can’t change the built-in traces table schema. The way to add “columns” is to attach custom properties on the trace, which land in the customDimensions bag; then project them as columns in KQL.

### Add properties in Node.js (Application Insights SDK)


### Query as if they were columns (KQL)

The properties are in customDimensions (a dynamic JSON bag). Turn them into real columns at query time:

```kql
traces
| where timestamp > ago(1h)
| extend
    orderId = tostring(customDimensions.orderId),
    region = tostring(customDimensions.region),
    customerTier = tostring(customDimensions.customerTier)
| project timestamp, message, severityLevel, orderId, region, customerTier
```


If you have many properties and want them all as columns temporarily:

```kql
traces
| where timestamp > ago(1h)
| invoke bag_unpack(customDimensions)
```


(Then cast types with tostring(), toint(), todouble(), etc.)


If you actually need fixed columns (for governance, strong typing, or very large payloads), send that data to a custom table via a Data Collection Rule (Logs Ingestion API) and then join with traces. You still keep the small, high-signal bits in customDimensions.

Limits to remember (so columns don’t get truncated)
- custom properties per item
- name ≤ ~150 chars; value ≤ ~8 KB
- message ≤ ~32 KB
- telemetry item ≤ ~64 KB

The reason we see a subproperty being truncated in customDimensions is that it reaches the 8KB limit.

For example:

```json
{
    "propertyA": {
        "propertyAB": "content is 6KB"
        "propertyAC": "content is 6KB"
    }
}
```

This will result in `propertyA` being truncated.

However, if the properties are flattened into separate keys, like this:

```json
{
    "propertyA_propertyAB": "content is 6KB"
    "propertyA_propertyAC": "content is 6KB"
}
```

Then all values are preserved and work as expected.

## Data Collection Rule


A Data Collection Rule (DCR) defines what data to collect, from where, and where to send it (e.g., a Log Analytics workspace).
To create one, you first create a Data Collection Endpoint (DCE) (the ingestion entry point), then create the DCR that maps incoming data streams to a destination table, and finally define the table schema to store your logs. Together, the DCE + DCR + table form the ingestion pipeline for custom log data in Azure Monitor.

Useful resources:

- [Data Collection Rule Overview](https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/data-collection-rule-overview)
- [How to create schema and log ingestion](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/tutorial-logs-ingestion-api?tabs=dcr)

An example of joining log entries between custom and application insight tables:

```kql
MyTable_CL
| where TimeGenerated > ago(1h) 
| join kind=inner AppTraces on OperationId
| where OperationId != ""
```


## Examples

- **Application Insights Ingestion** — script [ingest-ai.js](./ingest-ai.js) demonstrates how to ingest log entries into Application Insights using OpenTelemetry.  
- **DCR Ingestion** — script [ingest-dcr.js](./ingest-dcr.js) demonstrates how to ingest log entries into a custom Log Analytics table via a Data Collection Rule (DCR).  
- **Hybrid Ingestion** — script [ingest-hybrid.js](./ingest-hybrid.js) demonstrates how to ingest log entries into both Application Insights and a custom table simultaneously.
