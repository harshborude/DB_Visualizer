import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import ReactFlow, { Background, Controls, MarkerType, Handle, Position, useNodesState, useEdgesState, applyNodeChanges } from 'reactflow'
import type { Node, Edge, NodeChange } from 'reactflow'
import 'reactflow/dist/style.css'
import { processPostgresSchema } from './parser/sql/postgresql'
import type { TableData } from './types/schema'
import { getLayoutedElements } from './utils/layout'

function TableNode({ data }: { data: { table: TableData, isHovered?: boolean, isConnected?: boolean, isFaded?: boolean } }) {
  const { table, isHovered, isConnected, isFaded } = data;
  
  let glowStyle = '0 4px 15px rgba(0,0,0,0.5)'; // default dark shadow
  let borderColor = '#475569'; // lighter slate-600 border so it stands out
  
  if (isHovered) {
    glowStyle = '0 0 25px rgba(56, 189, 248, 0.6)'; // Sky Blue glow
    borderColor = '#38bdf8'; // sky-400
  } else if (isConnected) {
    glowStyle = '0 0 20px rgba(6, 182, 212, 0.4)'; // Cyan glow
    borderColor = '#06b6d4'; // cyan-500
  }

  return (
    <div style={{ 
      border: `2px solid ${borderColor}`, 
      borderRadius: '12px', 
      padding: '1.25rem', 
      minWidth: '280px', 
      backgroundColor: '#1e293b', // slate-800, lighter than before
      boxShadow: glowStyle,
      opacity: isFaded ? 0.3 : 1,
      transition: 'box-shadow 0.3s ease, border-color 0.3s ease, opacity 0.3s ease',
      color: '#f8fafc',
    }}>
      <Handle type="target" position={Position.Left} style={{ background: '#38bdf8', width: '8px', height: '8px', border: 'none' }} />
      
      <h3 style={{ margin: '0 0 1.25rem 0', paddingBottom: '1rem', color: '#f1f5f9', fontSize: '1.4rem', letterSpacing: '0.025em', textAlign: 'center', borderBottom: '2px dotted #334155' }}>{table.name}</h3>
      
      <ul style={{ paddingLeft: '0', margin: '0', listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {table.columns.map(col => {
          const isPrimaryKey = table.primaryKeys?.includes(col.name)
          return (
            <li key={col.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <strong style={{ color: '#f8fafc', fontWeight: '500' }}>{col.name}</strong> 
                <span style={{ color: '#94a3b8', marginLeft: '0.5rem', fontSize: '0.85em', fontFamily: 'monospace' }}>{col.type}</span>
              </div>
              {isPrimaryKey && (
                <span title="Primary Key" className="primary-badge" style={{ 
                  marginLeft: '0.5rem', 
                  fontSize: '0.7rem', 
                  fontWeight: '600', 
                  padding: '2px 6px',
                  borderRadius: '4px',
                  letterSpacing: '0.05em'
                }}>P.K</span>
              )}
            </li>
          )
        })}
      </ul>

      {table.foreignKeys && table.foreignKeys.length > 0 && (
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '2px dotted #334155' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Relationships</h4>
          <ul style={{ paddingLeft: '0', margin: '0', fontSize: '0.85rem', listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {table.foreignKeys.map((fk, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="relationship-badge" style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  letterSpacing: '0.05em'
                }}>
                  {fk.relationType}
                </span>
                <span style={{ color: '#cbd5e1' }}>
                  <code style={{ color: '#e2e8f0', background: '#1e293b', padding: '2px 4px', borderRadius: '4px' }}>{fk.columnNames.join(', ')}</code> 
                  <span style={{ color: '#64748b', margin: '0 4px' }}>&rarr;</span> 
                  <code style={{ color: '#e2e8f0', background: '#1e293b', padding: '2px 4px', borderRadius: '4px' }}>{fk.targetTable}({fk.targetColumnNames.join(', ')})</code>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <Handle type="source" position={Position.Right} style={{ background: '#38bdf8', width: '8px', height: '8px', border: 'none' }} />
    </div>
  )
}

function App() {
  const [tables, setTables] = useState<TableData[]>([])
  const [nodes, setNodes] = useNodesState<Node[]>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([])
  
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
  
  const [error, setError] = useState<string | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const nodeTypes = useMemo(() => ({ table: TableNode }), []);

  useEffect(() => {
    if (tables.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const newNodes: Node[] = tables.map((table, i) => ({
      id: table.name,
      type: 'table',
      position: { x: (i % 5) * 400, y: Math.floor(i / 5) * 550 },
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

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges, 'LR');

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [tables, setNodes, setEdges]);

  const processFile = async (file: File) => {
    setError(null)
    setIsParsing(true)
    
    try {
      const text = await file.text()
      const parsedTables = await processPostgresSchema(text)
      setTables(parsedTables)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "An error occurred while parsing the schema.")
    } finally {
      setIsParsing(false)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
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
        <div style={{ flex: 1, backgroundColor: '#0f172a' }}>
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
            fitView
            minZoom={0.1}
          >
            <Background color="#1e293b" gap={24} size={2} />
            <Controls style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', fill: '#94a3b8' }} />
          </ReactFlow>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#0f172a' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 700, margin: '0 0 1rem 0', letterSpacing: '-0.025em' }}>
          <span style={{ color: '#38bdf8' }}>ERDiagram</span>
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
          Upload a PostgreSQL <code>schema.sql</code> dump file to instantly visualize its tables and relationships in a beautiful, interactive canvas.
        </p>
      </div>
      
      <div 
        className="glass-dropzone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        style={{
          borderRadius: '16px',
          padding: '4rem 2rem',
          textAlign: 'center',
          cursor: 'pointer',
          width: '100%',
          maxWidth: '600px',
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <p style={{ color: '#f1f5f9', fontSize: '1.2rem', fontWeight: 500, margin: '0 0 0.5rem 0' }}>Drag and drop your schema.sql here</p>
        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>or click to browse from your computer</p>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".sql" 
          style={{ display: 'none' }} 
        />
      </div>

      {isParsing && (
        <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#38bdf8' }}>
          <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
            <line x1="16.24" y1="4.93" x2="19.07" y2="7.76"></line>
          </svg>
          <span>Parsing database schema via WASM...</span>
        </div>
      )}
      
      {error && (
        <div style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', marginTop: '2rem', padding: '1rem 1.5rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', maxWidth: '600px', width: '100%' }}>
          <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Error Parsing File:</strong> {error}
        </div>
      )}
    </div>
  )
}

export default App
