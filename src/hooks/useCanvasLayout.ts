import { useEffect, useCallback } from 'react';
import { type Node, type Edge, type NodeChange, applyNodeChanges, useNodesState, useEdgesState, MarkerType } from 'reactflow';
import { getLayoutedElements } from '../utils/layout';
import type { AnalyzedTableData } from '../utils/graphAnalytics';
import type { QueryBuilderState } from '../utils/queryBuilder';

export function useCanvasLayout(
  tables: AnalyzedTableData[],
  setQueryBuilderState: React.Dispatch<React.SetStateAction<QueryBuilderState>>
) {
  const [nodes, setNodes] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (nodes.length > 0) {
      const positions: Record<string, { x: number, y: number }> = {};
      nodes.forEach(n => { positions[n.id] = n.position; });
      sessionStorage.setItem('erd-positions', JSON.stringify(positions));
    }
  }, [nodes]);

  useEffect(() => {
    if (tables.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const savedPositionsStr = sessionStorage.getItem('erd-positions');
    let savedPositions: Record<string, { x: number, y: number }> | null = null;
    try {
      if (savedPositionsStr) savedPositions = JSON.parse(savedPositionsStr);
    } catch { }

    const newNodes: Node[] = tables.map((table, i) => ({
      id: table.name,
      type: 'table',
      position: savedPositions?.[table.name] || { x: (i % 5) * 400, y: Math.floor(i / 5) * 550 },
      data: { table }
    }));

    const newEdges: Edge[] = [];
    tables.forEach(table => {
      table.foreignKeys.forEach((fk, fkIdx) => {
        newEdges.push({
          id: `${table.name}-${fk.targetTable}-${fkIdx}`,
          source: table.name,
          target: fk.targetTable,
          // We connect from the FIRST column in the foreign key to the FIRST column in the target primary key
          sourceHandle: `${fk.columnNames[0]}-right-source`,
          targetHandle: `${fk.targetColumnNames[0]}-left-target`,
          type: 'crows-foot',
          label: `${fk.columnNames.join(', ')} → ${fk.targetColumnNames.join(', ')}`,
          labelBgStyle: { fill: '#1e293b', stroke: '#334155', strokeWidth: 1, rx: 4, ry: 4 },
          labelStyle: { fill: '#cbd5e1', fontSize: 10, fontWeight: 500, fontFamily: 'monospace' },
          data: { isImplicit: fk.isImplicit, relationType: fk.relationType },
          style: {
            stroke: '#94a3b8',
            strokeWidth: 3
          },
          animated: false,
        });
      })
    })

    if (!savedPositions || Object.keys(savedPositions).length === 0) {
      // First time layout
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges, 'LR');
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    } else {
      // Use saved positions
      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [tables, setNodes, setEdges]);

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    // Intercept position changes for alias nodes (clones)
    const positionChanges = changes.filter(c => c.type === 'position' && ((c as any).position || (c as any).positionAbsolute)) as any[];
    if (positionChanges.length > 0) {
      setQueryBuilderState(prev => {
        let updated = false;
        const newTables = prev.tables.map(t => {
          if (t.id !== t.name) {
            const change = positionChanges.find(c => c.id === t.id);
            const newPos = change?.positionAbsolute || change?.position;
            if (change && newPos) {
              updated = true;
              return { ...t, position: newPos };
            }
          }
          return t;
        });
        return updated ? { ...prev, tables: newTables } : prev;
      });
    }

    setNodes((currentNodes) => {
      let nextNodes = applyNodeChanges(changes, currentNodes);

      const positionChanges = changes.filter((c: any) => c.type === 'position' && c.dragging);

      if (positionChanges.length > 0) {
        positionChanges.forEach((change: any) => {
          const a = nextNodes.find(n => n.id === change.id);
          if (!a) return;

          const wA = a.width ?? 320;
          const hA = a.height ?? 300;
          const cxA = a.position.x + wA / 2;
          const cyA = a.position.y + hA / 2;

          nextNodes = nextNodes.map(b => {
            if (a.id === b.id) return b;

            const wB = b.width ?? 320;
            const hB = b.height ?? 300;

            const isColliding = (
              a.position.x < b.position.x + wB &&
              a.position.x + wA > b.position.x &&
              a.position.y < b.position.y + hB &&
              a.position.y + hA > b.position.y
            );

            if (isColliding) {
              const cxB = b.position.x + wB / 2;
              const cyB = b.position.y + hB / 2;

              let dx = cxB - cxA;
              let dy = cyB - cyA;

              if (dx === 0 && dy === 0) {
                dx = Math.random() * 10 - 5;
                dy = Math.random() * 10 - 5;
              }

              // Apply heavily damped elastic push
              return {
                ...b,
                position: {
                  x: b.position.x + dx * 0.15,
                  y: b.position.y + dy * 0.15,
                }
              };
            }
            return b;
          });
        });
      }

      return nextNodes;
    });
  }, [setNodes, setQueryBuilderState]);

  return {
    nodes,
    setNodes,
    edges,
    setEdges,
    onEdgesChange,
    handleNodesChange
  };
}
