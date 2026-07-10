import { buildJoinGraph, type JoinEdge } from './pathfinder';
import type { AnalyzedTableData } from './graphAnalytics';

export interface QueryColumn {
  tableName: string;
  columnName: string;
  alias?: string;
  func?: 'COUNT' | 'SUM' | 'AVG' | 'MAX' | 'MIN';
}

export interface QueryFilter {
  id: string;
  tableName: string;
  columnName: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN';
  value: string;
}

export interface QuerySort {
  tableName: string;
  columnName: string;
  direction: 'ASC' | 'DESC';
}

export interface ManualJoin {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
}

export interface QueryBuilderState {
  tables: string[];
  columns: QueryColumn[];
  filters: QueryFilter[];
  sorts: QuerySort[];
  manualJoins: ManualJoin[];
}

export class UnreachableTableError extends Error {
  public tableName: string;
  constructor(tableName: string) {
    super(`No relationship found connecting table '${tableName}' to the active query.`);
    this.name = 'UnreachableTableError';
    this.tableName = tableName;
  }
}

/**
 * Automatically calculates a spanning tree (set of JoinEdges) that connects all the selected tables.
 * Throws UnreachableTableError if a table cannot be reached and no manual join is provided.
 */
export function buildQuerySpanningTree(
  selectedTables: string[],
  schema: AnalyzedTableData[],
  manualJoins: ManualJoin[]
): JoinEdge[] {
  if (selectedTables.length <= 1) return [];

  const graph = buildJoinGraph(schema);
  const activeGroup = new Set<string>([selectedTables[0]]);
  const collectedEdges: JoinEdge[] = [];

  for (let i = 1; i < selectedTables.length; i++) {
    const targetTable = selectedTables[i];
    if (activeGroup.has(targetTable)) continue;

    // Multi-source BFS to find shortest path from ANY table in activeGroup to targetTable
    const queue: string[] = Array.from(activeGroup);
    const visited = new Set<string>(activeGroup);
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

    if (pathFound) {
      // Backtrack to build the path
      let curr = targetTable;
      const pathEdges: JoinEdge[] = [];
      while (!activeGroup.has(curr)) {
        const edge = parentEdge.get(curr)!;
        pathEdges.unshift(edge);
        curr = edge.fromTable;
      }
      
      // Add path to collected edges, avoiding duplicates
      for (const edge of pathEdges) {
        const isDuplicate = collectedEdges.some(e => 
          (e.fromTable === edge.fromTable && e.toTable === edge.toTable) || 
          (e.fromTable === edge.toTable && e.toTable === edge.fromTable)
        );
        if (!isDuplicate) {
          collectedEdges.push(edge);
        }
        activeGroup.add(edge.fromTable);
        activeGroup.add(edge.toTable);
      }
    } else {
      // Try to resolve via manual joins
      let manualEdgeFound = false;
      for (const mj of manualJoins) {
        // Source is in active group, target is the disconnected table
        if (mj.targetTable === targetTable && activeGroup.has(mj.sourceTable)) {
          collectedEdges.push({
            fromTable: mj.sourceTable,
            toTable: mj.targetTable,
            fromColumns: [mj.sourceColumn],
            toColumns: [mj.targetColumn],
            direction: 'forward'
          });
          activeGroup.add(targetTable);
          manualEdgeFound = true;
          break;
        }
        // Target is in active group, source is the disconnected table
        if (mj.sourceTable === targetTable && activeGroup.has(mj.targetTable)) {
           collectedEdges.push({
            fromTable: mj.targetTable,
            toTable: mj.sourceTable,
            fromColumns: [mj.targetColumn],
            toColumns: [mj.sourceColumn],
            direction: 'backward'
          });
          activeGroup.add(targetTable);
          manualEdgeFound = true;
          break;
        }
      }
      
      if (!manualEdgeFound) {
        throw new UnreachableTableError(targetTable);
      }
    }
  }

  return collectedEdges;
}

export function compileQuery(state: QueryBuilderState, schema: AnalyzedTableData[]): string {
  if (state.tables.length === 0) return '';

  let sql = 'SELECT\n';
  
  if (state.columns.length === 0) {
    sql += '  *\n';
  } else {
    const cols = state.columns.map(c => {
      let colStr = `${c.tableName}.${c.columnName}`;
      if (c.func) colStr = `${c.func}(${colStr})`;
      if (c.alias) colStr += ` AS "${c.alias}"`;
      return `  ${colStr}`;
    });
    sql += cols.join(',\n') + '\n';
  }

  const baseTable = state.tables[0];
  sql += `FROM ${baseTable}\n`;

  if (state.tables.length > 1) {
    let edges: JoinEdge[] = [];
    try {
      edges = buildQuerySpanningTree(state.tables, schema, state.manualJoins);
    } catch (e) {
      if (e instanceof UnreachableTableError) {
        return `-- Error: ${e.message}\n-- Please provide a manual join condition.`;
      }
      throw e;
    }

    // Determine JOIN ordering based on connected components
    const joinedTables = new Set<string>([baseTable]);
    const pendingEdges = [...edges];

    while (pendingEdges.length > 0) {
      const idx = pendingEdges.findIndex(e => joinedTables.has(e.fromTable) || joinedTables.has(e.toTable));
      if (idx === -1) {
        // Failsafe: Should not happen if buildQuerySpanningTree is correct
        break;
      }
      
      const edge = pendingEdges.splice(idx, 1)[0];
      let joinTarget = '';
      let condition = '';
      
      if (joinedTables.has(edge.fromTable)) {
        joinTarget = edge.toTable;
        condition = edge.fromColumns.map((col, i) => `${edge.fromTable}.${col} = ${edge.toTable}.${edge.toColumns[i]}`).join(' AND ');
      } else {
        joinTarget = edge.fromTable;
        condition = edge.toColumns.map((col, i) => `${edge.toTable}.${col} = ${edge.fromTable}.${edge.fromColumns[i]}`).join(' AND ');
      }
      
      if (!joinedTables.has(joinTarget)) {
        sql += `JOIN ${joinTarget}\n  ON ${condition}\n`;
        joinedTables.add(joinTarget);
      }
    }
  }

  if (state.filters.length > 0) {
    sql += 'WHERE\n';
    const filters = state.filters.map((f, i) => {
      const prefix = i === 0 ? '  ' : '  AND ';
      let val = f.value;
      if (f.operator === 'IN') {
        val = `(${val})`;
      } else if (isNaN(Number(val))) {
        val = `'${val}'`;
      }
      return `${prefix}${f.tableName}.${f.columnName} ${f.operator} ${val}`;
    });
    sql += filters.join('\n') + '\n';
  }

  if (state.sorts.length > 0) {
    sql += 'ORDER BY\n';
    const sorts = state.sorts.map(s => `  ${s.tableName}.${s.columnName} ${s.direction}`);
    sql += sorts.join(',\n') + '\n';
  }

  return sql.trim() + ';';
}
