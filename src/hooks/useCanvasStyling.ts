import { useMemo } from 'react';
import { type Node, type Edge, MarkerType } from 'reactflow';
import { getLayoutedElements } from '../utils/layout';
import type { AnalyzedTableData } from '../utils/graphAnalytics';
import type { QueryBuilderState } from '../utils/queryBuilder';
import type { PathResult } from '../utils/pathfinder';

interface UseCanvasStylingProps {
  nodes: Node[];
  edges: Edge[];
  isQueryBuilderMode: boolean;
  queryBuilderState: QueryBuilderState;
  hoveredNodeId: string | null;
  hoveredEdgeId: string | null;
  selectedTable: AnalyzedTableData | null;
  isIsolatedMode: boolean;
  pathResult: PathResult | null;
  handleToggleColumn: (tableId: string, columnName: string) => void;
  handleToggleTable: (tableId: string, baseTableName: string) => void;
  isMobile: boolean;
}

export function useCanvasStyling({
  nodes,
  edges,
  isQueryBuilderMode,
  queryBuilderState,
  hoveredNodeId,
  hoveredEdgeId,
  selectedTable,
  isIsolatedMode,
  pathResult,
  handleToggleColumn,
  handleToggleTable,
  isMobile
}: UseCanvasStylingProps) {

  const qbNodes = useMemo(() => {
    if (!isQueryBuilderMode) return nodes;

    const aliasNodes: Node[] = [];
    queryBuilderState.tables.forEach((t) => {
       if (t.id !== t.name) {
          const baseNode = nodes.find(n => n.id === t.name);
          if (baseNode) {
            aliasNodes.push({
               ...baseNode,
               id: t.id,
               position: t.position || { x: baseNode.position.x + 80, y: baseNode.position.y + 80 }, 
               data: { ...baseNode.data }
            });
          }
       }
    });
    return [...nodes, ...aliasNodes];
  }, [nodes, isQueryBuilderMode, queryBuilderState.tables]);

  const qbEdges = useMemo(() => {
    if (!isQueryBuilderMode) return edges;

    const aliasEdges: Edge[] = [];
    queryBuilderState.tables.forEach(t => {
       if (t.id !== t.name) {
          edges.forEach(e => {
             if (e.source === t.name) aliasEdges.push({ ...e, id: `${e.id}-src-${t.id}`, source: t.id });
             if (e.target === t.name) aliasEdges.push({ ...e, id: `${e.id}-tgt-${t.id}`, target: t.id });
          });
       }
    });
    return [...edges, ...aliasEdges];
  }, [edges, isQueryBuilderMode, queryBuilderState.tables]);

  const styledNodes = useMemo(() => {
    const activeNodeId = hoveredNodeId || selectedTable?.name || null;

    const injectQbProps = (n: Node) => ({
      ...n.data,
      tableId: n.id,
      isQueryBuilderMode,
      selectedColumns: queryBuilderState.columns.filter(c => c.tableId === n.id).map(c => c.columnName),
      isTableSelected: queryBuilderState.tables.some(t => t.id === n.id),
      onToggleColumn: handleToggleColumn,
      onToggleTable: handleToggleTable,
      isMobile,
      isIsolatedMode
    });

    if (!activeNodeId && !hoveredEdgeId) return qbNodes.map(n => ({ ...n, data: { ...injectQbProps(n), isFaded: false, isHovered: false, isConnected: false } }));

    const activeEdge = qbEdges.find(e => e.id === hoveredEdgeId);

    return qbNodes.map(n => {
      let isHovered = false;
      let isConnected = false;
      let isFaded = true;

      if (activeNodeId) {
        isHovered = n.id === activeNodeId;
        isConnected = qbEdges.some(e => (e.source === activeNodeId && e.target === n.id) || (e.target === activeNodeId && e.source === n.id));
        isFaded = !isHovered && !isConnected;
      } else if (activeEdge) {
        isConnected = n.id === activeEdge.source || n.id === activeEdge.target;
        isFaded = !isConnected;
      }

      return {
        ...n,
        data: {
          ...injectQbProps(n),
          isHovered: n.id === hoveredNodeId || n.id === selectedTable?.name,
          isConnected,
          isFaded
        }
      }
    });
  }, [qbNodes, qbEdges, hoveredNodeId, hoveredEdgeId, selectedTable, isQueryBuilderMode, queryBuilderState.columns, queryBuilderState.tables, handleToggleColumn, handleToggleTable, isMobile, isIsolatedMode]);

  const styledEdges = useMemo(() => {
    const activeNodeId = hoveredNodeId || selectedTable?.name || null;
    if (!activeNodeId && !hoveredEdgeId) return qbEdges.map(e => ({
      ...e,
      style: { ...e.style, opacity: 1, stroke: '#94a3b8', strokeWidth: 3, zIndex: 0 },
      labelStyle: { ...(e.labelStyle as React.CSSProperties), opacity: 1 },
      labelBgStyle: { ...(e.labelBgStyle as React.CSSProperties), opacity: 1 },
      animated: false,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }
    }));

    return qbEdges.map(e => {
      let isConnected = false;

      if (activeNodeId) {
        isConnected = e.source === activeNodeId || e.target === activeNodeId;
      } else if (hoveredEdgeId) {
        isConnected = e.id === hoveredEdgeId;
      }

      const opacity = isConnected ? 1 : 0.3;
      return {
        ...e,
        style: {
          ...e.style,
          stroke: isConnected ? '#38bdf8' : '#475569',
          strokeWidth: isConnected ? 4 : 3,
          opacity: opacity,
          zIndex: isConnected ? 10 : 0,
          transition: 'stroke 0.3s ease, stroke-width 0.3s ease, opacity 0.3s ease'
        },
        labelStyle: { ...(e.labelStyle as React.CSSProperties), opacity: opacity, transition: 'opacity 0.3s ease' },
        labelBgStyle: { ...(e.labelBgStyle as React.CSSProperties), opacity: opacity, transition: 'opacity 0.3s ease' },
        animated: isConnected,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isConnected ? '#38bdf8' : '#475569'
        }
      };
    });
  }, [qbEdges, hoveredNodeId, hoveredEdgeId, selectedTable]);

  const { visibleNodes, visibleEdges } = useMemo(() => {
    if (pathResult && pathResult.found) {
      const pathSet = new Set(pathResult.tables);

      const isolatedNodes = styledNodes.filter(n => pathSet.has(n.id)).map(n => ({
        ...n,
        data: { ...n.data, isHovered: true, isConnected: true, isFaded: false }
      }));

      // Only include edges that are explicitly part of the path
      const isolatedEdges = styledEdges.filter(e => {
        return pathResult.edges.some(pe =>
          (pe.fromTable === e.source && pe.toTable === e.target) ||
          (pe.fromTable === e.target && pe.toTable === e.source)
        );
      }).map(e => ({
        ...e,
        style: { ...e.style, stroke: '#0ea5e9', strokeWidth: 4, opacity: 1, zIndex: 10 },
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#0ea5e9' }
      }));

      try {
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(isolatedNodes, isolatedEdges, 'LR');
        return { visibleNodes: layoutedNodes, visibleEdges: layoutedEdges };
      } catch (err) {
        console.error("Layout failed for pathfinder:", err);
        return { visibleNodes: isolatedNodes, visibleEdges: isolatedEdges };
      }
    }

    if (isQueryBuilderMode) {
      if (isIsolatedMode && queryBuilderState.tables.length > 0) {
        const selectedTableIds = new Set(queryBuilderState.tables.map(t => t.id));
        const baseNodeIds = new Set(queryBuilderState.tables.map(t => t.name));
        
        const isolatedNodes = styledNodes.filter(n => selectedTableIds.has(n.id) || baseNodeIds.has(n.id));
        const isolatedEdges = styledEdges.filter(e => 
          (selectedTableIds.has(e.source) || baseNodeIds.has(e.source)) && 
          (selectedTableIds.has(e.target) || baseNodeIds.has(e.target))
        );
        return { visibleNodes: isolatedNodes, visibleEdges: isolatedEdges };
      }
      return { visibleNodes: styledNodes, visibleEdges: styledEdges };
    }

    if (!isIsolatedMode || !selectedTable) {
      return {
        visibleNodes: styledNodes,
        visibleEdges: styledEdges
      };
    }

    const anchorNodeId = selectedTable.name;
    const connectedNodeIds = new Set<string>([anchorNodeId]);

    edges.forEach(e => {
      if (e.source === anchorNodeId) connectedNodeIds.add(e.target);
      if (e.target === anchorNodeId) connectedNodeIds.add(e.source);
    });

    const isolatedNodes = styledNodes.filter(n => connectedNodeIds.has(n.id));
    const isolatedEdges = styledEdges.filter(e => connectedNodeIds.has(e.source) && connectedNodeIds.has(e.target));

    // Auto-layout just these nodes
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(isolatedNodes, isolatedEdges, 'LR');

    return { visibleNodes: layoutedNodes, visibleEdges: layoutedEdges };
  }, [styledNodes, styledEdges, isIsolatedMode, selectedTable, edges, pathResult, isQueryBuilderMode, queryBuilderState.tables]);

  return { visibleNodes, visibleEdges };
}
