import { useState, useMemo, useEffect, useCallback } from 'react'
import ReactFlow, { Background, Controls, MarkerType, type Node, type Edge, type NodeChange, applyNodeChanges, useNodesState, useEdgesState } from 'reactflow'
import 'reactflow/dist/style.css'
import { processPostgresSchema } from './parser/sql/postgresql'
import { analyzeSchema, type AnalyzedTableData } from './utils/graphAnalytics'
import { getLayoutedElements } from './utils/layout'

// Modular Components
import { TableNode } from './components/canvas/TableNode'
import { Dropzone } from './components/ui/Dropzone'
import { DetailsPanelShell } from './components/panel/DetailsPanelShell'
import type { ActiveTab } from './types/ui'

function App() {
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
  
  const [error, setError] = useState<string | null>(null)
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
      const positions: Record<string, {x: number, y: number}> = {};
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
    let savedPositions: Record<string, {x: number, y: number}> | null = null;
    try {
      if (savedPositionsStr) savedPositions = JSON.parse(savedPositionsStr);
    } catch {}

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
      const parsedTables = await processPostgresSchema(text)
      const analyzedTables = analyzeSchema(parsedTables)
      // Clear positions for new file
      localStorage.removeItem('erd-positions');
      setTables(analyzedTables)
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
  }

  // Derive styled nodes and edges based on hover state
  const styledNodes = useMemo(() => {
    if (!hoveredNodeId && !hoveredEdgeId) return nodes.map(n => ({ ...n, data: { ...n.data, isFaded: false, isHovered: false, isConnected: false } }));
    
    const activeEdge = edges.find(e => e.id === hoveredEdgeId);

    return nodes.map(n => {
      let isHovered = false;
      let isConnected = false;
      let isFaded = true;

      if (hoveredNodeId) {
        isHovered = n.id === hoveredNodeId;
        isConnected = edges.some(e => (e.source === hoveredNodeId && e.target === n.id) || (e.target === hoveredNodeId && e.source === n.id));
        isFaded = !isHovered && !isConnected;
      } else if (activeEdge) {
        isConnected = n.id === activeEdge.source || n.id === activeEdge.target;
        isFaded = !isConnected;
      }
      
      return {
        ...n,
        data: {
          ...n.data,
          isHovered,
          isConnected,
          isFaded
        }
      }
    });
  }, [nodes, edges, hoveredNodeId, hoveredEdgeId]);

  const styledEdges = useMemo(() => {
    if (!hoveredNodeId && !hoveredEdgeId) return edges.map(e => ({
      ...e, 
      style: { ...e.style, opacity: 1, stroke: '#94a3b8', strokeWidth: 3, zIndex: 0 },
      animated: false,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }
    }));
    
    return edges.map(e => {
      let isConnected = false;
      
      if (hoveredNodeId) {
        isConnected = e.source === hoveredNodeId || e.target === hoveredNodeId;
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
  }, [edges, hoveredNodeId, hoveredEdgeId]);

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
          justifyContent: 'space-between', 
          alignItems: 'center',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50
        }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#38bdf8' }}>ERDiagram</span> Canvas
          </h2>
          <button 
            onClick={() => setTables([])} 
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
            Upload New File
          </button>
        </div>
        <div style={{ flex: 1, backgroundColor: '#0f172a', position: 'relative' }}>
          <ReactFlow 
            nodes={styledNodes} 
            edges={styledEdges} 
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeMouseEnter={onNodeMouseEnter}
            onNodeMouseLeave={onNodeMouseLeave}
            onEdgeMouseEnter={onEdgeMouseEnter}
            onEdgeMouseLeave={onEdgeMouseLeave}
            onNodeClick={onNodeClick}
            fitView
            minZoom={0.1}
          >
            <Background color="#1e293b" gap={24} size={2} />
            <Controls style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', fill: '#94a3b8' }} />
          </ReactFlow>

          {selectedTable && (
            <DetailsPanelShell 
              selectedTable={selectedTable}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onClose={() => setSelectedTable(null)}
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
