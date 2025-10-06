import { DefaultAzureCredential } from '@azure/identity';
import { LogsQueryClient, LogsQueryResultStatus } from '@azure/monitor-query-logs';

const workspaceId = '2499370b-ccf7-4bb3-a500-8094765dc62c'; // Replace with your App Insights Workspace ID

async function fetchLogLine(operationId) {
  const credential = new DefaultAzureCredential();
  const client = new LogsQueryClient(credential);

  try {
    const past = new Date()
    past.setDate(past.getDate() - 5);
    const kqlQuery = `MyTable_CL | where OperationId == "${operationId}"`;
    const result = await client.queryWorkspace(workspaceId, kqlQuery, {
      startTime: past,
      endTime: new Date()
    });

    if (result.status === LogsQueryResultStatus.Success) {
      const table = result.tables[0];
      // Print rows
      return table.rows[0]; // Return the DurationMs value]
    } else {
      console.error('Query failed:', result.partialError);
    }
  } catch (err) {
    console.error('Error querying Application Insights:', err);
    throw err
  }
}

async function main() {
  // replace with with file path with arguments
  const operationId = process.argv[2]

  const content = await fetchLogLine(operationId)
  console.log("Size: ", JSON.stringify(content).length)
}

await main();
