import type { TableData } from '../types/schema';
import { calculateRowSize } from './tableWeight';

export interface GraphMetrics {
  inDegree: number;
  outDegree: number;
  incomingDependencies: string[]; // Tables that depend on this table
  outgoingDependencies: string[]; // Tables that this table depends on
  isRoot: boolean;
  isLeaf: boolean;
  isIsolated: boolean;
  impactRadius: number; // Number of downstream tables affected if this table changes
  partOfCycle: boolean;
  componentId: number; // Island / connected component ID
  componentSize: number; // Number of tables in this component
}

export interface AnalyzedTableData extends TableData {
  metrics: GraphMetrics;
  estimatedRowBytes: number;
}

/**
 * Parses an array of TableData into a Directed Graph and computes
 * various graph theory metrics like degrees, impact radius, and cyclic dependencies.
 */
export function analyzeSchema(tables: TableData[]): AnalyzedTableData[] {
  // 1. Initialize data structures
  const tableMap = new Map<string, AnalyzedTableData>();

  // 1.5. Infer Implicit Relationships
  // e.g. `company_id` -> `companies.id` or `company.id`
  const tableNames = new Set(tables.map(t => t.name.toLowerCase()));
  const tableOriginalNames = new Map(tables.map(t => [t.name.toLowerCase(), t.name]));

  tables.forEach(table => {
    table.columns.forEach(col => {
      const colLower = col.name.toLowerCase();
      if (colLower.endsWith('_id') && colLower !== '_id' && colLower !== 'id') {
        const baseName = colLower.slice(0, -3); // e.g. 'company'
        
        // check for exact match, or plural matches
        const possibleTargets = [
          baseName,
          baseName + 's',
          baseName + 'es',
          baseName.endsWith('y') ? baseName.slice(0, -1) + 'ies' : ''
        ].filter(Boolean);

        for (const pt of possibleTargets) {
          if (tableNames.has(pt) && pt !== table.name.toLowerCase()) {
            const actualTargetName = tableOriginalNames.get(pt)!;
            
            // Check if there's already an explicit FK for this column
            const hasExplicit = table.foreignKeys.some(fk => 
              fk.columnNames.includes(col.name) && fk.targetTable === actualTargetName
            );

            if (!hasExplicit) {
              table.foreignKeys.push({
                columnNames: [col.name],
                targetTable: actualTargetName,
                targetColumnNames: ['id'], // assuming it points to 'id'
                relationType: 'n:1',
                isImplicit: true
              });
            }
            break; // found the target
          }
        }
      }
    });
  });

  // Dependency graph: key -> array of tables that this key DEPENDS ON (Outgoing edges)
  const outgoingEdges = new Map<string, string[]>();
  // Impact graph: key -> array of tables that DEPEND ON this key (Incoming edges)
  const incomingEdges = new Map<string, string[]>();

  tables.forEach(t => {
    tableMap.set(t.name, {
      ...t,
      estimatedRowBytes: calculateRowSize(t.columns),
      metrics: {
        inDegree: 0,
        outDegree: 0,
        incomingDependencies: [],
        outgoingDependencies: [],
        isRoot: false,
        isLeaf: false,
        isIsolated: false,
        impactRadius: 0,
        partOfCycle: false,
        componentId: 0,
        componentSize: 0,
      }
    });
    outgoingEdges.set(t.name, []);
    incomingEdges.set(t.name, []);
  });

  // 2. Build the graph (edges)
  tables.forEach(table => {
    const sourceName = table.name;
    table.foreignKeys.forEach(fk => {
      const targetName = fk.targetTable;
      if (tableMap.has(targetName)) { // Ensure target exists
        // sourceName depends on targetName
        outgoingEdges.get(sourceName)?.push(targetName);
        incomingEdges.get(targetName)?.push(sourceName);

        const sourceMetrics = tableMap.get(sourceName)!.metrics;
        sourceMetrics.outDegree++;
        if (!sourceMetrics.outgoingDependencies.includes(targetName)) {
          sourceMetrics.outgoingDependencies.push(targetName);
        }

        const targetMetrics = tableMap.get(targetName)!.metrics;
        targetMetrics.inDegree++;
        if (!targetMetrics.incomingDependencies.includes(sourceName)) {
          targetMetrics.incomingDependencies.push(sourceName);
        }
      }
    });
  });

  // 3. Compute Root, Leaf, Isolated
  tableMap.forEach((analyzedTable) => {
    const metrics = analyzedTable.metrics;
    if (metrics.inDegree === 0) metrics.isRoot = true;
    if (metrics.outDegree === 0) metrics.isLeaf = true;
    if (metrics.inDegree === 0 && metrics.outDegree === 0) metrics.isIsolated = true;
  });

  // 4. Compute Impact Radius (BFS on incomingEdges)
  // If we change X, what tables are impacted? The tables that depend on X (incomingEdges to X).
  tableMap.forEach((analyzedTable, startNode) => {
    const visited = new Set<string>();
    const queue = [startNode];
    visited.add(startNode);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const impactedTables = incomingEdges.get(current) || [];

      for (const impacted of impactedTables) {
        if (!visited.has(impacted)) {
          visited.add(impacted);
          queue.push(impacted);
        }
      }
    }

    // Impact radius is all nodes reached minus the start node itself
    analyzedTable.metrics.impactRadius = visited.size - 1;
  });

  // 5. Detect Circular Dependencies using Tarjan's Strongly Connected Components algorithm
  let index = 0;
  const indices = new Map<string, number>();
  const lowlinks = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];

  const strongconnect = (v: string) => {
    indices.set(v, index);
    lowlinks.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);

    const targets = outgoingEdges.get(v) || [];
    for (const w of targets) {
      if (!indices.has(w)) {
        strongconnect(w);
        lowlinks.set(v, Math.min(lowlinks.get(v)!, lowlinks.get(w)!));
      } else if (onStack.has(w)) {
        // Successor w is in stack S and hence in the current SCC
        lowlinks.set(v, Math.min(lowlinks.get(v)!, indices.get(w)!));
      }
    }

    // If v is a root node, pop the stack and generate an SCC
    if (lowlinks.get(v) === indices.get(v)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);

      // If the SCC has more than 1 node, it's a true circular dependency cycle.
      if (scc.length > 1) {
        scc.forEach(node => {
          tableMap.get(node)!.metrics.partOfCycle = true;
        });
      } else {
        // Check for self-loops (A -> A)
        if (targets.includes(v)) {
          tableMap.get(v)!.metrics.partOfCycle = true;
        }
      }
    }
  };

  tableMap.forEach((_, v) => {
    if (!indices.has(v)) {
      strongconnect(v);
    }
  });

  // 6. Find Connected Components (Islands) using Undirected DFS
  // Two tables are in the same component if they are connected by any path, ignoring direction.
  let currentComponentId = 1;
  const visitedForComponents = new Set<string>();
  const componentSizes = new Map<number, number>();

  const componentDFS = (node: string, compId: number) => {
    visitedForComponents.add(node);
    tableMap.get(node)!.metrics.componentId = compId;

    // Traverse both incoming and outgoing edges to treat graph as undirected
    const neighbors = [
      ...(outgoingEdges.get(node) || []),
      ...(incomingEdges.get(node) || [])
    ];

    let size = 1;

    for (const neighbor of neighbors) {
      if (!visitedForComponents.has(neighbor)) {
        size += componentDFS(neighbor, compId);
      }
    }
    return size;
  };

  tableMap.forEach((_, node) => {
    if (!visitedForComponents.has(node)) {
      const size = componentDFS(node, currentComponentId);
      componentSizes.set(currentComponentId, size);
      currentComponentId++;
    }
  });

  // Assign componentSize to each table
  tableMap.forEach((analyzedTable) => {
    analyzedTable.metrics.componentSize = componentSizes.get(analyzedTable.metrics.componentId) || 0;
  });

  return Array.from(tableMap.values());
}
