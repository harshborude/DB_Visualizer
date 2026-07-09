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
import type { ActiveTab } from './types/ui'

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };
  const [tables, setTables] = useState<AnalyzedTableData[]>(() => {
    try {
      const saved = localStorage.getItem('erd-tables');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  })

  const [nodes, setNodes] = useNodesState<Node[]>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([])

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)

  const [selectedTable, setSelectedTable] = useState<AnalyzedTableData | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [isIsolatedMode, setIsIsolatedMode] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [rfInstance, setRfInstance] = useState<any>(null);
  const [isParsing, setIsParsing] = useState(false)

  const nodeTypes = useMemo(() => ({ table: TableNode }), []);

  // Save tables and nodes to localStorage
  useEffect(() => {
    if (tables.length > 0) {
      localStorage.setItem('erd-tables', JSON.stringify(tables));
    } else {
      localStorage.removeItem('erd-tables');
      localStorage.removeItem('erd-positions');
    }
  }, [tables]);

  useEffect(() => {
    if (nodes.length > 0) {
      const positions: Record<string, { x: number, y: number }> = {};
      nodes.forEach(n => { positions[n.id] = n.position; });
      localStorage.setItem('erd-positions', JSON.stringify(positions));
    }
  }, [nodes]);

  useEffect(() => {
    if (tables.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const savedPositionsStr = localStorage.getItem('erd-positions');
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
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#94a3b8' // Bolder, whiter slate-400
          },
          style: { strokeWidth: 3, stroke: '#94a3b8' },
          animated: false,
        })
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
      localStorage.removeItem('erd-positions');
      setTables(analyzedTables)
      setSelectedTable(null)
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
  }

  // Derive styled nodes and edges based on hover and selection state
  const styledNodes = useMemo(() => {
    const activeNodeId = hoveredNodeId || selectedTable?.name || null;
    if (!activeNodeId && !hoveredEdgeId) return nodes.map(n => ({ ...n, data: { ...n.data, isFaded: false, isHovered: false, isConnected: false } }));

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
          ...n.data,
          isHovered: n.id === hoveredNodeId || n.id === selectedTable?.name,
          isConnected,
          isFaded
        }
      }
    });
  }, [nodes, edges, hoveredNodeId, hoveredEdgeId, selectedTable]);

  const styledEdges = useMemo(() => {
    const activeNodeId = hoveredNodeId || selectedTable?.name || null;
    if (!activeNodeId && !hoveredEdgeId) return edges.map(e => ({
      ...e,
      style: { ...e.style, opacity: 1, stroke: '#94a3b8', strokeWidth: 3, zIndex: 0 },
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

      return {
        ...e,
        style: {
          ...e.style,
          stroke: isConnected ? '#38bdf8' : '#475569',
          strokeWidth: isConnected ? 4 : 3,
          opacity: isConnected ? 1 : 0.3,
          zIndex: isConnected ? 10 : 0,
          transition: 'stroke 0.3s ease, stroke-width 0.3s ease, opacity 0.3s ease'
        },
        animated: isConnected,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isConnected ? '#38bdf8' : '#475569'
        }
      };
    });
  }, [edges, hoveredNodeId, hoveredEdgeId, selectedTable]);

  const { visibleNodes, visibleEdges } = useMemo(() => {
    if (!isIsolatedMode || !selectedTable) {
      return { visibleNodes: styledNodes, visibleEdges: styledEdges };
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
  }, [styledNodes, styledEdges, isIsolatedMode, selectedTable, edges]);

  const previousSelectedTableRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedTable) {
      previousSelectedTableRef.current = selectedTable.name;
    }
  }, [selectedTable]);

  useEffect(() => {
    if (isIsolatedMode && rfInstance) {
      setTimeout(() => {
        rfInstance.fitView({ padding: 0.2, duration: 800 });
      }, 50); // slight delay to allow nodes to re-render
    } else if (!isIsolatedMode && rfInstance) {
      const targetTableId = selectedTable?.name || previousSelectedTableRef.current;
      if (targetTableId) {
        setTimeout(() => {
          const node = rfInstance.getNode(targetTableId);
          if (node) {
            const width = node.width ?? 320;
            const height = node.height ?? 300;
            const x = node.position.x + width / 2;
            const y = node.position.y + height / 2;
            rfInstance.setCenter(x, y, { zoom: 0.3, duration: 800 });
          }
        }, 50);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIsolatedMode, rfInstance]);

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
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0f172a' }}>
        <div style={{
          padding: '1rem 2rem',
          backgroundColor: 'rgba(30, 41, 59, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50
        }}>
          <h2
            onClick={() => setTables([])}
            style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 600,
              color: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              transition: 'opacity 0.2s ease',
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)'
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
          >
            <span style={{ color: '#38bdf8' }}>ERDiagram</span> Canvas
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                Auto Layout
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
              Upload New File
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

        <div style={{ flex: 1, backgroundColor: '#0f172a', position: 'relative' }}>
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
            }}
            onInit={setRfInstance}
            fitView
            minZoom={0.1}
          >
            <Background color="rgba(255, 255, 255, 0.2)" gap={24} size={2} />
            <Controls style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', fill: '#94a3b8' }} />
          </ReactFlow>

          {selectedTable && (
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
            />
          )}

          <SearchPanelShell
            tables={tables}
            selectedTable={selectedTable}
            onSelectTable={(table) => {
              setSelectedTable(table);
              setActiveTab('overview');
              setIsIsolatedMode(false);

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
