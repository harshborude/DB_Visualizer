import { buildQuerySpanningTree, compileQuery, QueryBuilderState } from './src/utils/queryBuilder';
import { processSchema } from './src/parser/sql';
import { analyzeSchema } from './src/utils/graphAnalytics';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  // Load the schema
  const sqlContent = fs.readFileSync('C:\\Users\\METHEI\\Desktop\\dvdrental.sql', 'utf-8');
  const rawTables = await processSchema(sqlContent);
  const tables = analyzeSchema(rawTables);

  // Test State
  const state: QueryBuilderState = {
    tables: [
      { id: 'customer_1', name: 'customer' },
      { id: 'store_1', name: 'store' },
      { id: 'fake_table_1', name: 'fake_table' }
    ], 
    columns: [
      { tableId: 'customer_1', columnName: 'first_name' }
    ],
    filters: [],
    sorts: [],
    manualJoins: []
  };

  console.log('--- TESTING COMPILE QUERY ---');
  const sql = compileQuery(state, tables);
  console.log(sql);
}

run().catch(console.error);
