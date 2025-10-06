table="MyTable_CL"
az rest --method put --url "/subscriptions/${DCR_SUBSCRIPTION}/resourcegroups/${DCR_RESOURCEGROUP}/providers/microsoft.operationalinsights/workspaces/${DCR_WORKSPACE}/tables/${table}?api-version=2022-10-01" --body @schema.json
# az rest --method get --url "/subscriptions/${DCR_SUBSCRIPTION}/resourcegroups/${DCR_RESOURCEGROUP}/providers/microsoft.operationalinsights/workspaces/${DCR_WORKSPACE}/tables/${table}?api-version=2022-10-01"
