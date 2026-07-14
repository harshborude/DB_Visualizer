import { buildJoinGraph, type JoinEdge } from './pathfinder';
import type { AnalyzedTableData } from './graphAnalytics';

export interface QueryTable {
  id: string; // The alias/unique ID for this instance (e.g. "users_1")
  name: string; // The base table name (e.g. "users")
  position?: { x: number, y: number }; // Used for preserving canvas position of clones
}

export interface QueryColumn {
  tableId: string;
  columnName: string;
  alias?: string;
  func?: 'COUNT' | 'SUM' | 'AVG' | 'MAX' | 'MIN';
}

export interface QueryFilter {
  id: string;
  tableId: string;
  columnName: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN';
  value: string;
}

export interface QuerySort {
  tableId: string;
  columnName: string;
  direction: 'ASC' | 'DESC';
}

export interface ManualJoin {
  sourceTableId: string;
  sourceColumn: string;
  targetTableId: string;
  targetColumn: string;
}

export interface QueryBuilderState {
  tables: QueryTable[];
  columns: QueryColumn[];
  filters: QueryFilter[];
  sorts: QuerySort[];
  manualJoins: ManualJoin[];
}

export class UnreachableTableError extends Error {
  public tableId: string;
  constructor(tableId: string) {
    super(`No relationship found connecting table instance '${tableId}' to the active query.`);
    this.name = 'UnreachableTableError';
    this.tableId = tableId;
  }
}

/**
 * Automatically calculates a spanning tree (set of JoinEdges) that connects all the selected tables.
 * Throws UnreachableTableError if a table cannot be reached and no manual join is provided.
 */
export function buildQuerySpanningTree(
  selectedTables: QueryTable[],
  schema: AnalyzedTableData[],
  manualJoins: ManualJoin[]
): JoinEdge[] {
  if (selectedTables.length <= 1) return [];

  const graph = buildJoinGraph(schema);
  const activeGroup = new Set<string>([selectedTables[0].id]);
  const collectedEdges: JoinEdge[] = [];

  for (let i = 1; i < selectedTables.length; i++) {
    const targetTable = selectedTables[i];
    if (activeGroup.has(targetTable.id)) continue;

    // Multi-source BFS to find shortest path from ANY table in activeGroup to targetTable
    const queue: string[] = Array.from(activeGroup);
    const visited = new Set<string>(activeGroup);
    const parentEdge = new Map<string, JoinEdge>();
    
    let pathFound = false;

    while (queue.length > 0) {
      const currentTableId = queue.shift()!;
      if (currentTableId === targetTable.id) {
        pathFound = true;
        break;
      }
      
      let currentTableBaseName = '';
      const currentTableInfo = selectedTables.find(t => t.id === currentTableId);
      if (currentTableInfo) {
        currentTableBaseName = currentTableInfo.name;
      } else {
        currentTableBaseName = currentTableId;
      }

      const neighbors = graph.get(currentTableBaseName) || [];
      for (const edge of neighbors) {
        // Find all selected instances of the target base table
        const matchingInstances = selectedTables.filter(t => t.name === edge.toTable);
        
        // If there are no matching instances selected, we could potentially spawn intermediate nodes
        // BUT currently, query builder spanning tree only connects existing selected tables directly.
        // Wait, if it traverses through UNSELECTED tables, what happens?
        // Ah, the original code traversed through unselected tables by using the base table name!
        // We need to allow traversing through unselected base tables.
        
        if (matchingInstances.length > 0) {
          for (const instance of matchingInstances) {
             if (!visited.has(instance.id)) {
                visited.add(instance.id);
                parentEdge.set(instance.id, {
                  ...edge,
                  fromTable: currentTableId,
                  toTable: instance.id
                });
                queue.push(instance.id);
             }
          }
        } else {
          // It's an unselected table, we can traverse through it. We'll use its base name as its ID
          // to represent the intermediate hop.
          const unselectedId = edge.toTable;
          if (!visited.has(unselectedId)) {
            visited.add(unselectedId);
            parentEdge.set(unselectedId, {
              ...edge,
              fromTable: currentTableId,
              toTable: unselectedId
            });
            queue.push(unselectedId);
          }
        }
      }
    }

    if (pathFound) {
      // Backtrack to build the path
      let curr = targetTable.id;
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
        if (mj.targetTableId === targetTable.id && activeGroup.has(mj.sourceTableId)) {
          collectedEdges.push({
            fromTable: mj.sourceTableId,
            toTable: mj.targetTableId,
            fromColumns: [mj.sourceColumn],
            toColumns: [mj.targetColumn],
            direction: 'forward'
          });
          activeGroup.add(targetTable.id);
          manualEdgeFound = true;
          break;
        }
        if (mj.sourceTableId === targetTable.id && activeGroup.has(mj.targetTableId)) {
           collectedEdges.push({
            fromTable: mj.targetTableId,
            toTable: mj.sourceTableId,
            fromColumns: [mj.targetColumn],
            toColumns: [mj.sourceColumn],
            direction: 'backward'
          });
          activeGroup.add(targetTable.id);
          manualEdgeFound = true;
          break;
        }
      }
      
      if (!manualEdgeFound) {
        throw new UnreachableTableError(targetTable.id);
      }
    }
  }

  return collectedEdges;
}

export interface OptimalPathResult {
  minEdges: number;
  optimizedOrder: QueryTable[] | null;
  alternateOrders: QueryTable[][];
}

export function findOptimalQuerySpanningTree(
  selectedTables: QueryTable[],
  schema: AnalyzedTableData[],
  manualJoins: ManualJoin[]
): OptimalPathResult {
  if (selectedTables.length <= 1) {
    return { minEdges: 0, optimizedOrder: null, alternateOrders: [] };
  }

  let currentEdges = 0;
  let currentTreeStr = '';
  try {
    const currentTree = buildQuerySpanningTree(selectedTables, schema, manualJoins);
    currentEdges = currentTree.length;
    currentTreeStr = currentTree.map(e => [e.fromTable, e.toTable].sort().join('-')).sort().join(',');
  } catch (e) {
    return { minEdges: 0, optimizedOrder: null, alternateOrders: [] };
  }

  const generatePermutations = (arr: QueryTable[]): QueryTable[][] => {
    if (arr.length <= 1) return [arr];
    const perms: QueryTable[][] = [];
    for (let i = 0; i < arr.length; i++) {
      const current = arr[i];
      const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
      const remainingPerms = generatePermutations(remaining);
      for (const p of remainingPerms) {
        perms.push([current, ...p]);
      }
    }
    return perms;
  };

  const permsToTry = selectedTables.length <= 6 
    ? generatePermutations(selectedTables) 
    : [selectedTables, ...selectedTables.map((_, i) => {
        if (i === 0) return selectedTables;
        const arr = [...selectedTables];
        const temp = arr[0];
        arr[0] = arr[i];
        arr[i] = temp;
        return arr;
      }).slice(1)];

  let minEdges = currentEdges;
  let optimalOrders: QueryTable[][] = [];
  const seenTopology = new Set<string>([currentTreeStr]);

  for (const perm of permsToTry) {
    try {
      const tree = buildQuerySpanningTree(perm, schema, manualJoins);
      const edgeCount = tree.length;
      const treeStr = tree.map(e => [e.fromTable, e.toTable].sort().join('-')).sort().join(',');

      if (edgeCount < minEdges) {
        minEdges = edgeCount;
        optimalOrders = [perm];
        seenTopology.clear();
        seenTopology.add(currentTreeStr);
        seenTopology.add(treeStr);
      } else if (edgeCount === minEdges) {
        if (!seenTopology.has(treeStr)) {
          optimalOrders.push(perm);
          seenTopology.add(treeStr);
        }
      }
    } catch (e) {
      // ignore
    }
  }

  let optimizedOrder: QueryTable[] | null = null;
  let alternateOrders: QueryTable[][] = [];

  if (minEdges < currentEdges) {
    optimizedOrder = optimalOrders.length > 0 ? optimalOrders[0] : null;
    alternateOrders = optimalOrders.slice(1);
  } else {
    alternateOrders = optimalOrders;
  }

  return { minEdges, optimizedOrder, alternateOrders };
}


export function compileQuery(state: QueryBuilderState, schema: AnalyzedTableData[]): string {
  if (state.tables.length === 0) return '';

  let sql = 'SELECT\n';
  
  if (state.columns.length === 0) {
    sql += '  *\n';
  } else {
    const selectItems: string[] = [];
    const columnsByTableId = new Map<string, typeof state.columns>();
    for (const c of state.columns) {
      if (!columnsByTableId.has(c.tableId)) columnsByTableId.set(c.tableId, []);
      columnsByTableId.get(c.tableId)!.push(c);
    }
    
    const collapsedTables = new Set<string>();

    for (const table of state.tables) {
      const tableData = schema.find(t => t.name === table.name);
      if (!tableData) continue;
      
      const cols = columnsByTableId.get(table.id) || [];
      const hasFuncOrAlias = cols.some(c => c.func || c.alias);
      
      if (!hasFuncOrAlias && cols.length > 0 && cols.length === tableData.columns.length) {
        const selectedColNames = new Set(cols.map(c => c.columnName));
        const allPresent = tableData.columns.every(c => selectedColNames.has(c.name));
        
        if (allPresent) {
           collapsedTables.add(table.id);
        }
      }
    }
    
    const addedCollapsed = new Set<string>();

    for (const c of state.columns) {
      if (collapsedTables.has(c.tableId)) {
        if (!addedCollapsed.has(c.tableId)) {
          selectItems.push(`  ${c.tableId}.*`);
          addedCollapsed.add(c.tableId);
        }
      } else {
        let colStr = `${c.tableId}.${c.columnName}`;
        if (c.func) colStr = `${c.func}(${colStr})`;
        if (c.alias) colStr += ` AS "${c.alias}"`;
        selectItems.push(`  ${colStr}`);
      }
    }
    
    sql += selectItems.join(',\n') + '\n';
  }

  const baseTable = state.tables[0];
  sql += `FROM ${baseTable.name} ${baseTable.id}\n`;

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

    const joinedTables = new Set<string>([baseTable.id]);
    const pendingEdges = [...edges];

    while (pendingEdges.length > 0) {
      const idx = pendingEdges.findIndex(e => joinedTables.has(e.fromTable) || joinedTables.has(e.toTable));
      if (idx === -1) {
        break; 
      }
      
      const edge = pendingEdges.splice(idx, 1)[0];
      let joinTargetId = '';
      let condition = '';
      
      if (joinedTables.has(edge.fromTable)) {
        joinTargetId = edge.toTable;
        condition = edge.fromColumns.map((col, i) => `${edge.fromTable}.${col} = ${edge.toTable}.${edge.toColumns[i]}`).join(' AND ');
      } else {
        joinTargetId = edge.fromTable;
        condition = edge.toColumns.map((col, i) => `${edge.toTable}.${col} = ${edge.fromTable}.${edge.fromColumns[i]}`).join(' AND ');
      }
      
      if (!joinedTables.has(joinTargetId)) {
        // Join target might be a selected alias, or an unselected base table hop
        const selectedInstance = state.tables.find(t => t.id === joinTargetId);
        const joinTargetName = selectedInstance ? selectedInstance.name : joinTargetId;
        const alias = selectedInstance ? joinTargetId : joinTargetId;
        
        sql += `JOIN ${joinTargetName} ${alias}\n  ON ${condition}\n`;
        joinedTables.add(joinTargetId);
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
      return `${prefix}${f.tableId}.${f.columnName} ${f.operator} ${val}`;
    });
    sql += filters.join('\n') + '\n';
  }

  if (state.sorts.length > 0) {
    sql += 'ORDER BY\n';
    const sorts = state.sorts.map(s => `  ${s.tableId}.${s.columnName} ${s.direction}`);
    sql += sorts.join(',\n') + '\n';
  }

  return sql.trim() + ';';
}
