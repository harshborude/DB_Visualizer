import fs from 'fs';
import { processSchema } from './src/parser/sql';
import { analyzeSchema } from './src/utils/graphAnalytics';
import { findShortestJoinPath } from './src/utils/pathfinder';
import { buildJoinGraph } from './src/utils/pathfinder';

async function runBenchmarks() {
  console.log("=== ERD Tool Benchmarks ===\n");

  const runTest = async (filename: string, numTables: number) => {
    console.log(`--- Testing ${numTables} Tables Schema ---`);
    if (!fs.existsSync(filename)) {
        console.log(`File ${filename} not found. Skipping.`);
        return;
    }
    const sql = fs.readFileSync(filename, 'utf-8');

    // 1. Parsing Time
    const startParse = performance.now();
    const tables = await processSchema(sql);
    const endParse = performance.now();
    const parseTime = (endParse - startParse).toFixed(2);
    console.log(`Parse Time (${numTables} tables): ${parseTime} ms`);

    // 2. Analysis Time (Graph, edges)
    const startAnalyze = performance.now();
    const analyzed = analyzeSchema(tables);
    const endAnalyze = performance.now();
    console.log(`Analyze Time (${numTables} tables): ${(endAnalyze - startAnalyze).toFixed(2)} ms`);

    // 3. Pathfinder Time (Shortest Path)
    // The tables are generated such that table_1 is connected to table_2 connected to table_3 ...
    // Let's test a path from table_1 to table_8 (7 hops) or to table_50 (49 hops)
    if (numTables >= 100) {
        const startPath1 = performance.now();
        const path1 = findShortestJoinPath('table_1', 'table_8', analyzed, 'shortest');
        const endPath1 = performance.now();
        console.log(`Pathfinder (table_1 -> table_8, shortest): ${(endPath1 - startPath1).toFixed(2)} ms. Found edges: ${path1?.edges?.length || 0}`);

        const startPath2 = performance.now();
        const path2 = findShortestJoinPath('table_1', 'table_50', analyzed, 'shortest');
        const endPath2 = performance.now();
        console.log(`Pathfinder (table_1 -> table_50, shortest): ${(endPath2 - startPath2).toFixed(2)} ms. Found edges: ${path2?.edges?.length || 0}`);

        const startPath3 = performance.now();
        const path3 = findShortestJoinPath('table_1', 'table_50', analyzed, 'indexed');
        const endPath3 = performance.now();
        console.log(`Pathfinder (table_1 -> table_50, indexed): ${(endPath3 - startPath3).toFixed(2)} ms. Found edges: ${path3?.edges?.length || 0}`);
    }
    
    console.log("");
  };

  await runTest('postgresql_100_table_dump.sql', 100);
  await runTest('postgresql_500_table_dump.sql', 500);
  await runTest('postgresql_1000_table_dump.sql', 1000);
}

runBenchmarks().catch(console.error);
