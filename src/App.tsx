import { useState, useMemo, useRef, useEffect } from 'react'
import ReactFlow, { Background, Controls } from 'reactflow'
import 'reactflow/dist/style.css'
import { getLayoutedElements } from './utils/layout'

// Modular Components
import { TableNode } from './components/canvas/TableNode'
import { Dropzone } from './components/ui/Dropzone'
import { DetailsPanelShell } from './components/panel/DetailsPanelShell'
import { SearchPanelShell } from './components/panel/SearchPanelShell'
import { PathfinderModal } from './components/ui/PathfinderModal'
import { PathfinderSQLPanel } from './components/panel/PathfinderSQLPanel'
import { QueryBuilderPanel } from './components/panel/QueryBuilderPanel'
import { CanvasLegend } from './components/canvas/CanvasLegend'
import { AppHeader } from './components/layout/AppHeader'
import { findShortestJoinPath } from './utils/pathfinder'
import { useIsMobile } from './hooks/useIsMobile'
import type { ActiveTab } from './types/ui'

// Custom Hooks
import { useSchemaState } from './hooks/useSchemaState'
import { useQueryBuilderMode } from './hooks/useQueryBuilderMode'
import { useCanvasLayout } from './hooks/useCanvasLayout'
import { useCanvasStyling } from './hooks/useCanvasStyling'

function App() {
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [rfInstance, setRfInstance] = useState<any>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isIsolatedMode, setIsIsolatedMode] = useState(false);
  const [isPathfinderModalOpen, setIsPathfinderModalOpen] = useState(false);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(window.innerWidth >= 768);

  const {
    tables, setTables,
    error, setError,
    isParsing, processFile,
    pathResult, setPathResult,
    selectedTable, setSelectedTable
  } = useSchemaState();

  const {
    isQueryBuilderMode, setIsQueryBuilderMode,
    queryBuilderState, setQueryBuilderState,
    handleToggleColumn, handleToggleTable
  } = useQueryBuilderMode(tables);

  const {
    nodes, setNodes,
    edges, setEdges,
    onEdgesChange, handleNodesChange
  } = useCanvasLayout(tables, setQueryBuilderState);

  const { visibleNodes, visibleEdges } = useCanvasStyling({
    nodes, edges,
    isQueryBuilderMode, queryBuilderState,
    hoveredNodeId, hoveredEdgeId,
    selectedTable, isIsolatedMode, pathResult,
    handleToggleColumn, handleToggleTable, isMobile
  });

  const nodeTypes = useMemo(() => ({ table: TableNode }), []);

  useEffect(() => {
    if (rfInstance) {
      setTimeout(() => {
        rfInstance.fitView({ padding: 0.2, duration: 800 });
      }, 50);
    }
  }, [isIsolatedMode, pathResult, rfInstance]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  if (tables.length > 0) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: isQueryBuilderMode ? '#000000' : '#0f172a' }}>
        <AppHeader
          isQueryBuilderMode={isQueryBuilderMode}
          tables={tables}
          isMobile={isMobile}
          isParsing={isParsing}
          fileInputRef={fileInputRef}
          handleFileChange={handleFileChange}
          setTables={setTables}
          setPathResult={setPathResult}
          setIsPathfinderModalOpen={setIsPathfinderModalOpen}
          toggleQueryBuilder={() => {
            setIsQueryBuilderMode(prev => !prev);
            if (isQueryBuilderMode) {
              setQueryBuilderState({ tables: [], columns: [], filters: [], sorts: [], manualJoins: [] });
            } else {
              setActiveTab('overview');
              setSelectedTable(null);
            }
          }}
          autoLayout={() => {
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges, 'LR');
            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
          }}
        />

        {error && (
          <div style={{ position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 60, color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <strong>Error:</strong> {error}
            <button onClick={() => setError(null)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        )}

        <div style={{ flex: 1, backgroundColor: isQueryBuilderMode ? '#000000' : '#0f172a', position: 'relative', transition: 'background-color 0.3s ease' }}>
          <ReactFlow
            nodes={visibleNodes}
            edges={visibleEdges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeMouseEnter={(_, node) => setHoveredNodeId(node.id)}
            onNodeMouseLeave={() => setHoveredNodeId(null)}
            onEdgeMouseEnter={(_, edge) => setHoveredEdgeId(edge.id)}
            onEdgeMouseLeave={() => setHoveredEdgeId(null)}
            onNodeClick={(_, node) => {
              setSelectedTable(node.data.table);
              setActiveTab('overview');
              setIsIsolatedMode(false);
              setPathResult(null);
            }}
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
            <Background color={isQueryBuilderMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.2)'} gap={24} size={2} />
            <Controls style={{ backgroundColor: isQueryBuilderMode ? '#000000' : '#0f172a', border: isQueryBuilderMode ? '1px solid #333' : '1px solid #1e293b', fill: isQueryBuilderMode ? '#10b981' : '#94a3b8' }} />
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
              isIsolatedMode={isIsolatedMode}
              onToggleIsolation={() => setIsIsolatedMode(prev => !prev)}
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
