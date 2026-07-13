import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import ReactFlow, { Background, Controls, MarkerType, type Node, type Edge, type NodeChange, applyNodeChanges, useNodesState, useEdgesState } from 'reactflow'
import 'reactflow/dist/style.css'
import { processSchema } from './parser/sql'
import { analyzeSchema, type AnalyzedTableData } from './utils/graphAnalytics'
import { getLayoutedElements } from './utils/layout'

// Modular Components
import { TableNode } from './components/canvas/TableNode'
import { Dropzone } from './components/ui/Dropzone'
import { DetailsPanelShell } from './components/panel/DetailsPanelShell'
import { SearchPanelShell } from './components/panel/SearchPanelShell'
import { PathfinderModal } from './components/ui/PathfinderModal'
import { PathfinderSQLPanel } from './components/panel/PathfinderSQLPanel'
import { findShortestJoinPath, type PathResult } from './utils/pathfinder'
import { calculateRowSize } from './utils/tableWeight'
import type { QueryBuilderState } from './utils/queryBuilder'
import { QueryBuilderPanel } from './components/panel/QueryBuilderPanel';
import { CanvasLegend } from './components/canvas/CanvasLegend';
import { useIsMobile } from './hooks/useIsMobile';
import type { ActiveTab } from './types/ui'
function App() {
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };
  const [tables, setTables] = useState<AnalyzedTableData[]>(() => {
    try {
      const saved = sessionStorage.getItem('erd-tables');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((t: any) => ({
          ...t,
          estimatedRowBytes: t.estimatedRowBytes ?? calculateRowSize(t.columns)
        }));
      }
      return [];
    } catch { return []; }
  })

  const [nodes, setNodes] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)

  const [selectedTable, setSelectedTable] = useState<AnalyzedTableData | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [isIsolatedMode, setIsIsolatedMode] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [rfInstance, setRfInstance] = useState<any>(null);
  const [isParsing, setIsParsing] = useState(false)

  const [isPathfinderModalOpen, setIsPathfinderModalOpen] = useState(false)
  const [pathResult, setPathResult] = useState<PathResult | null>(null)

  // Query Builder State
  const [isQueryBuilderMode, setIsQueryBuilderMode] = useState(false)
  const [queryBuilderState, setQueryBuilderState] = useState<QueryBuilderState>({
    tables: [],
    columns: [],
    filters: [],
    sorts: [],
    manualJoins: []
  })

  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(window.innerWidth >= 768);

  const handleToggleColumn = useCallback((tableName: string, columnName: string) => {
    setQueryBuilderState(prev => {
      const isSelected = prev.columns.some(c => c.tableName === tableName && c.columnName === columnName)
      let newColumns = prev.columns
      if (isSelected) {
        newColumns = prev.columns.filter(c => !(c.tableName === tableName && c.columnName === columnName))
      } else {
        newColumns = [...prev.columns, { tableName, columnName }]
      }

      const newTables = Array.from(new Set([
        ...newColumns.map(c => c.tableName),
        ...prev.filters.map(f => f.tableName),
        ...prev.sorts.map(s => s.tableName)
      ]))

      return {
        ...prev,
        columns: newColumns,
        tables: newTables
      }
    })
  }, [])

  const handleToggleTable = useCallback((tableName: string) => {
    setQueryBuilderState(prev => {
      const isSelected = prev.tables.includes(tableName)
      let newTables = prev.tables
      let newColumns = prev.columns

      if (isSelected) {
        // Remove table and all its columns
        newTables = prev.tables.filter(t => t !== tableName)
        newColumns = prev.columns.filter(c => c.tableName !== tableName)
      } else {
        // Add table
        newTables = [...prev.tables, tableName]
      }

      // If table is removed, should we remove its filters/sorts? For now keep simple
      return {
        ...prev,
        tables: newTables,
        columns: newColumns
      }
    })
  }, [])

  const nodeTypes = useMemo(() => ({ table: TableNode }), []);

  // Save tables and nodes to sessionStorage
  useEffect(() => {
    if (tables.length > 0) {
      sessionStorage.setItem('erd-tables', JSON.stringify(tables));
    } else {
      sessionStorage.removeItem('erd-tables');
      sessionStorage.removeItem('erd-positions');
    }
  }, [tables]);

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
          label: `${fk.columnNames.join(', ')} → ${fk.targetColumnNames.join(', ')}`,
          labelBgStyle: { fill: '#1e293b', stroke: '#334155', strokeWidth: 1, rx: 4, ry: 4 },
          labelStyle: { fill: '#cbd5e1', fontSize: 10, fontWeight: 500, fontFamily: 'monospace' },
          data: { isImplicit: fk.isImplicit },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#94a3b8' // Bolder, whiter slate-400
          },
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

  const processFile = async (file: File) => {
    setError(null)
    setIsParsing(true)

    try {
      const text = await file.text()
      const parsedTables = await processSchema(text)
      const analyzedTables = analyzeSchema(parsedTables)
      // Clear positions for new file
      sessionStorage.removeItem('erd-positions');
      sessionStorage.removeItem('erd-tables');
      setTables(analyzedTables)
      setSelectedTable(null)
      setPathResult(null)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "An error occurred while parsing the schema.")
    } finally {
      setIsParsing(false)
    }
  }

  const onNodeMouseEnter = (_: React.MouseEvent, node: Node) => {
    setHoveredNodeId(node.id);
  }

  const onNodeMouseLeave = () => {
    setHoveredNodeId(null);
  }

  const onEdgeMouseEnter = (_: React.MouseEvent, edge: Edge) => {
    setHoveredEdgeId(edge.id);
  }

  const onEdgeMouseLeave = () => {
    setHoveredEdgeId(null);
  }

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedTable(node.data.table);
    setActiveTab('overview');
    setIsIsolatedMode(false);
    setPathResult(null);
  }

  const styledNodes = useMemo(() => {
    const activeNodeId = hoveredNodeId || selectedTable?.name || null;

    // Inject common query builder props
    const injectQbProps = (n: Node) => ({
      ...n.data,
      isQueryBuilderMode,
      selectedColumns: queryBuilderState.columns.filter(c => c.tableName === n.id).map(c => c.columnName),
      isTableSelected: queryBuilderState.tables.includes(n.id),
      onToggleColumn: handleToggleColumn,
      onToggleTable: handleToggleTable,
      isMobile,
      isIsolatedMode
    });

    if (!activeNodeId && !hoveredEdgeId) return nodes.map(n => ({ ...n, data: { ...injectQbProps(n), isFaded: false, isHovered: false, isConnected: false } }));

    const activeEdge = edges.find(e => e.id === hoveredEdgeId);

    return nodes.map(n => {
      let isHovered = false;
      let isConnected = false;
      let isFaded = true;

      if (activeNodeId) {
        isHovered = n.id === activeNodeId;
        isConnected = edges.some(e => (e.source === activeNodeId && e.target === n.id) || (e.target === activeNodeId && e.source === n.id));
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
  }, [nodes, edges, hoveredNodeId, hoveredEdgeId, selectedTable, isQueryBuilderMode, queryBuilderState.columns, queryBuilderState.tables, handleToggleColumn, handleToggleTable]);

  const styledEdges = useMemo(() => {
    const activeNodeId = hoveredNodeId || selectedTable?.name || null;
    if (!activeNodeId && !hoveredEdgeId) return edges.map(e => ({
      ...e,
      style: { ...e.style, opacity: 1, stroke: '#94a3b8', strokeWidth: 3, zIndex: 0 },
      labelStyle: { ...(e.labelStyle as React.CSSProperties), opacity: 1 },
      labelBgStyle: { ...(e.labelBgStyle as React.CSSProperties), opacity: 1 },
      animated: false,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }
    }));

    return edges.map(e => {
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
  }, [edges, hoveredNodeId, hoveredEdgeId, selectedTable]);

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
  }, [styledNodes, styledEdges, isIsolatedMode, selectedTable, edges, pathResult]);

  useEffect(() => {
    if (rfInstance) {
      setTimeout(() => {
        rfInstance.fitView({ padding: 0.2, duration: 800 });
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIsolatedMode, pathResult, rfInstance]);

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
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
  }, [setNodes]);

  if (tables.length > 0) {
    const isQb = isQueryBuilderMode;
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: isQb ? '#000000' : '#0f172a' }}>
        <div style={{
          padding: '0.5rem 2rem', // Reduced padding
          backgroundColor: isQb ? 'rgba(0, 0, 0, 0.95)' : 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: isQb ? '1px solid #222' : '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          transition: 'background-color 0.3s ease, border-color 0.3s ease'
        }}>
          <h2
            onClick={() => { setTables([]); setPathResult(null); }}
            style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 600,
              color: isQb ? '#ffffff' : '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              transition: 'opacity 0.2s ease',
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
          >
            {isQb ? (
              <><span style={{ color: '#10b981' }}>Query</span> <span style={{ color: '#3b82f6' }}>Builder</span></>
            ) : (
              <><span style={{ color: '#38bdf8' }}>ERDiagram</span> Canvas</>
            )}
          </h2>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {tables.length > 0 && (
              <button
                onClick={() => setIsPathfinderModalOpen(true)}
                style={{
                  padding: '0.4rem 1rem',
                  cursor: 'pointer',
                  backgroundColor: '#0369a1',
                  border: '1px solid #0284c7',
                  color: '#fff',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.9rem'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0369a1'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                {!isMobile && "Extract Data (Pathfinder)"}
              </button>
            )}

            {tables.length > 0 && (
              <button
                onClick={() => {
                  setIsQueryBuilderMode(prev => !prev);
                  if (isQueryBuilderMode) {
                    // Exiting mode, clear state
                    setQueryBuilderState({ tables: [], columns: [], filters: [], sorts: [], manualJoins: [] });
                  } else {
                    // Entering mode
                    setActiveTab('overview'); // reset tab
                    setSelectedTable(null);
                  }
                }}
                style={{
                  padding: '0.4rem 1rem',
                  cursor: 'pointer',
                  backgroundColor: isQueryBuilderMode ? '#0ea5e9' : 'transparent',
                  border: '1px solid #0ea5e9',
                  color: isQueryBuilderMode ? '#fff' : '#0ea5e9',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.9rem'
                }}
                onMouseOver={(e) => {
                  if (!isQueryBuilderMode) {
                    e.currentTarget.style.backgroundColor = 'rgba(14, 165, 233, 0.1)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isQueryBuilderMode) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                {!isMobile && (isQueryBuilderMode ? 'Exit Query Builder' : 'Query Builder')}
              </button>
            )}
            {tables.length > 0 && (
              <button
                onClick={() => {
                  const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges, 'LR');
                  setNodes(layoutedNodes);
                  setEdges(layoutedEdges);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  backgroundColor: 'transparent',
                  border: '1px solid #334155',
                  color: '#cbd5e1',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                  fontWeight: 500
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#1e293b';
                  e.currentTarget.style.borderColor = '#475569';
                  e.currentTarget.style.color = '#f8fafc';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = '#334155';
                  e.currentTarget.style.color = '#cbd5e1';
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                {!isMobile && "Auto Layout"}
              </button>
            )}
            {isParsing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', fontSize: '0.9rem' }}>
                <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="2" x2="12" y2="6"></line>
                  <line x1="12" y1="18" x2="12" y2="22"></line>
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                  <line x1="2" y1="12" x2="6" y2="12"></line>
                  <line x1="18" y1="12" x2="22" y2="12"></line>
                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                  <line x1="16.24" y1="4.93" x2="19.07" y2="7.76"></line>
                </svg>
                <span>Parsing...</span>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".sql"
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
              style={{
                padding: '0.5rem 1rem',
                cursor: isParsing ? 'not-allowed' : 'pointer',
                backgroundColor: 'transparent',
                border: '1px solid #334155',
                color: '#cbd5e1',
                borderRadius: '6px',
                transition: 'all 0.2s ease',
                fontWeight: 500,
                opacity: isParsing ? 0.5 : 1
              }}
              onMouseOver={(e) => {
                if (isParsing) return;
                e.currentTarget.style.backgroundColor = '#1e293b';
                e.currentTarget.style.borderColor = '#475569';
                e.currentTarget.style.color = '#f8fafc';
              }}
              onMouseOut={(e) => {
                if (isParsing) return;
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = '#334155';
                e.currentTarget.style.color = '#cbd5e1';
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              {!isMobile && "Upload New File"}
            </button>
          </div>
        </div>

        {/* Error banner if upload failed from canvas */}
        {error && (
          <div style={{ position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 60, color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <strong>Error:</strong> {error}
            <button onClick={() => setError(null)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        )}

        <div style={{ flex: 1, backgroundColor: isQb ? '#000000' : '#0f172a', position: 'relative', transition: 'background-color 0.3s ease' }}>
          <ReactFlow
            nodes={visibleNodes}
            edges={visibleEdges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeMouseEnter={onNodeMouseEnter}
            onNodeMouseLeave={onNodeMouseLeave}
            onEdgeMouseEnter={onEdgeMouseEnter}
            onEdgeMouseLeave={onEdgeMouseLeave}
            onNodeClick={onNodeClick}
            onPaneClick={() => {
              setSelectedTable(null);
              setIsIsolatedMode(false);
              setPathResult(null);
            }}
            onInit={setRfInstance}
            fitView
            minZoom={0.1}
            nodesConnectable={false}
          >
            <Background color={isQb ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.2)'} gap={24} size={2} />
            <Controls style={{ backgroundColor: isQb ? '#000000' : '#0f172a', border: isQb ? '1px solid #333' : '1px solid #1e293b', fill: isQb ? '#10b981' : '#94a3b8' }} />
          </ReactFlow>

          {!isQueryBuilderMode && selectedTable && (
            <DetailsPanelShell
              tables={tables}
              selectedTable={selectedTable}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onClose={() => {
                setSelectedTable(null);
                setIsIsolatedMode(false);
              }}
              isIsolatedMode={isIsolatedMode}
              onToggleIsolation={() => setIsIsolatedMode(prev => !prev)}
              isMobile={isMobile}
            />
          )}

          {isQueryBuilderMode && (
            <QueryBuilderPanel
              schema={tables}
              state={queryBuilderState}
              setState={setQueryBuilderState}
              onClose={() => setIsQueryBuilderMode(false)}
            />
          )}

          {isMobile && !isLeftPanelOpen && tables.length > 0 && !isQueryBuilderMode && (
            <button
              onClick={() => setIsLeftPanelOpen(true)}
              style={{
                position: 'absolute', top: '80px', left: '16px', zIndex: 40,
                backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc',
                padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
              Tables
            </button>
          )}

          {(!isMobile || isLeftPanelOpen) && (
            <SearchPanelShell
              tables={tables}
              selectedTable={selectedTable}
              isMobile={isMobile}
              onClose={isMobile ? () => setIsLeftPanelOpen(false) : undefined}
              onSelectTable={(table) => {
                setSelectedTable(table);
                setActiveTab('overview');
                setIsIsolatedMode(false);
                setPathResult(null);
                if (isMobile) setIsLeftPanelOpen(false);

                if (rfInstance) {
                  const node = nodes.find(n => n.id === table.name);
                  if (node) {
                    const width = node.width ?? 320;
                    const height = node.height ?? 300;
                    const x = node.position.x + width / 2;
                    const y = node.position.y + height / 2;
                    rfInstance.setCenter(x, y, { zoom: 0.3, duration: 800 });
                  }
                }
              }}
              onHoverTable={(tableName) => setHoveredNodeId(tableName)}
            />
          )}

          <CanvasLegend />

          {isPathfinderModalOpen && (
            <PathfinderModal
              tables={tables}
              onClose={() => setIsPathfinderModalOpen(false)}
              onFindPath={(source, target, strategy) => {
                const result = findShortestJoinPath(source, target, tables, strategy);
                if (result.found) {
                  setPathResult(result);
                  setSelectedTable(null);
                  setIsIsolatedMode(false);
                } else {
                  setError(`No relationship path found between ${source} and ${target}.`);
                }
              }}
            />
          )}

          {pathResult && pathResult.found && (
            <PathfinderSQLPanel
              pathResult={pathResult}
              tables={tables}
              onClose={() => setPathResult(null)}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <Dropzone
      onFileAccepted={processFile}
      isParsing={isParsing}
      error={error}
    />
  )
}

export default App
