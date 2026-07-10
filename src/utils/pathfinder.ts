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

/**
 * Finds the shortest path of JOINs between two tables using Breadth-First Search (BFS).
 */
export function findShortestJoinPath(
  sourceTable: string,
  targetTable: string,
  tables: AnalyzedTableData[]
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

  const queue: string[] = [sourceTable];
  const visited = new Set<string>();
  visited.add(sourceTable);

  // Tracks how we reached a specific table (toTable -> JoinEdge used to reach it)
  const parentEdge = new Map<string, JoinEdge>();

  let pathFound = false;

  while (queue.length > 0) {
    const currentTable = queue.shift()!;

    if (currentTable === targetTable) {
      pathFound = true;
      break;
    }

    const neighbors = graph.get(currentTable) || [];

    for (const edge of neighbors) {
      if (!visited.has(edge.toTable)) {
        visited.add(edge.toTable);
        parentEdge.set(edge.toTable, edge);
        queue.push(edge.toTable);
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

  return sql.trim() + ';';
}
