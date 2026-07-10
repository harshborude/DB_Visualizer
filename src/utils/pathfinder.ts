import type { AnalyzedTableData } from './graphAnalytics';

export interface JoinEdge {
  fromTable: string;
  toTable: string;
  fromColumns: string[];
  toColumns: string[];
  direction: 'forward' | 'backward';
}

export interface PathResult {
  found: boolean;
  tables: string[];
  edges: JoinEdge[];
  sqlQuery: string;
}

/**
 * Builds an undirected graph of tables based on foreign key relationships.
 * Needed because a JOIN can go either direction (A -> B or B -> A).
 */
export function buildJoinGraph(tables: AnalyzedTableData[]): Map<string, JoinEdge[]> {
  const graph = new Map<string, JoinEdge[]>();

  tables.forEach(t => graph.set(t.name, []));

  tables.forEach(table => {
    table.foreignKeys.forEach(fk => {
      const targetName = fk.targetTable;
      
      if (!graph.has(targetName)) return; // defensive

      // Forward edge: table -> targetName (table holds the FK)
      graph.get(table.name)!.push({
        fromTable: table.name,
        toTable: targetName,
        fromColumns: fk.columnNames,
        toColumns: fk.targetColumnNames,
        direction: 'forward'
      });

      // Backward edge: targetName -> table (targetName is referenced by table)
      graph.get(targetName)!.push({
        fromTable: targetName,
        toTable: table.name,
        fromColumns: fk.targetColumnNames,
        toColumns: fk.columnNames,
        direction: 'backward'
      });
    });
  });

  return graph;
}

export type PathfinderStrategy = 'shortest' | 'indexed';

/**
 * Finds the shortest path of JOINs between two tables using Dijkstra's Algorithm.
 */
export function findShortestJoinPath(
  sourceTable: string,
  targetTable: string,
  tables: AnalyzedTableData[],
  strategy: PathfinderStrategy = 'shortest'
): PathResult {
  if (sourceTable === targetTable) {
    return {
      found: true,
      tables: [sourceTable],
      edges: [],
      sqlQuery: `SELECT *\nFROM ${sourceTable};`
    };
  }

  const graph = buildJoinGraph(tables);
  
  if (!graph.has(sourceTable) || !graph.has(targetTable)) {
    return { found: false, tables: [], edges: [], sqlQuery: '' };
  }

  const distances = new Map<string, number>();
  const parentEdge = new Map<string, JoinEdge>();
  const pq: { table: string, cost: number }[] = [];

  tables.forEach(t => distances.set(t.name, Infinity));
  distances.set(sourceTable, 0);
  pq.push({ table: sourceTable, cost: 0 });

  let pathFound = false;

  while (pq.length > 0) {
    // Sort to simulate Priority Queue
    pq.sort((a, b) => a.cost - b.cost);
    const current = pq.shift()!;
    const currentTable = current.table;

    if (currentTable === targetTable) {
      pathFound = true;
      break;
    }

    if (current.cost > distances.get(currentTable)!) {
      continue; // outdated entry
    }

    const neighbors = graph.get(currentTable) || [];

    for (const edge of neighbors) {
      const edgeCost = getEdgeCost(edge, tables, strategy);
      const newCost = current.cost + edgeCost;

      if (newCost < distances.get(edge.toTable)!) {
        distances.set(edge.toTable, newCost);
        parentEdge.set(edge.toTable, edge);
        pq.push({ table: edge.toTable, cost: newCost });
      }
    }
  }

  if (!pathFound) {
    return { found: false, tables: [], edges: [], sqlQuery: '' };
  }

  // Reconstruct path
  const pathEdges: JoinEdge[] = [];
  const pathTables: string[] = [targetTable];
  let current = targetTable;

  while (current !== sourceTable) {
    const edge = parentEdge.get(current)!;
    pathEdges.unshift(edge); // prepend to get the correct order (source -> ... -> target)
    pathTables.unshift(edge.fromTable);
    current = edge.fromTable;
  }

  // Generate SQL
  const sqlQuery = generateJoinSQL(pathTables, pathEdges);

  return {
    found: true,
    tables: pathTables,
    edges: pathEdges,
    sqlQuery
  };
}

/**
 * Generates the SELECT ... JOIN ... SQL statement based on the path edges.
 */
function generateJoinSQL(tables: string[], edges: JoinEdge[]): string {
  if (tables.length === 0) return '';
  if (tables.length === 1) return `SELECT *\nFROM ${tables[0]};`;

  let sql = `SELECT *\nFROM ${tables[0]}\n`;

  edges.forEach(edge => {
    // Handle composite keys by joining them with AND
    const joinConditions = edge.fromColumns.map((fromCol, i) => {
      const toCol = edge.toColumns[i];
      return `${edge.fromTable}.${fromCol} = ${edge.toTable}.${toCol}`;
    }).join(' AND ');

    sql += `JOIN ${edge.toTable} \n  ON ${joinConditions}\n`;
  });

  return sql + ';';
}

function getEdgeCost(edge: JoinEdge, tables: AnalyzedTableData[], strategy: PathfinderStrategy): number {
  if (strategy === 'shortest') return 1;
  
  const fromTable = tables.find(t => t.name === edge.fromTable);
  const toTable = tables.find(t => t.name === edge.toTable);
  
  if (!fromTable || !toTable) return 100;
  
  const isFromIndexed = isColumnsIndexed(edge.fromColumns, fromTable);
  const isToIndexed = isColumnsIndexed(edge.toColumns, toTable);
  
  if (isFromIndexed && isToIndexed) return 25;
  if (isFromIndexed || isToIndexed) return 75;
  return 100;
}

function isColumnsIndexed(cols: string[], table: AnalyzedTableData): boolean {
  if (cols.length === 0) return false;
  // Check PKs
  if (cols.every(c => table.primaryKeys?.includes(c))) return true;
  // Check Unique Keys
  if (table.uniqueKeys?.some(uk => cols.every(c => uk.includes(c)))) return true;
  // Check explicit indexes
  if (table.indexes?.some(idx => cols.every(c => idx.includes(c)))) return true;
  
  return false;
}
