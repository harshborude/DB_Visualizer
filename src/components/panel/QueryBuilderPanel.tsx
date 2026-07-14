import React, { useState, useEffect } from 'react';
import type { AnalyzedTableData } from '../../utils/graphAnalytics';
import { type QueryBuilderState, compileQuery, UnreachableTableError, type QueryColumn, type QueryFilter, type QuerySort } from '../../utils/queryBuilder';

interface QueryBuilderPanelProps {
  schema: AnalyzedTableData[];
  state: QueryBuilderState;
  setState: React.Dispatch<React.SetStateAction<QueryBuilderState>>;
  onClose: () => void;
  isIsolatedMode: boolean;
  onToggleIsolation: () => void;
}

export function QueryBuilderPanel({ schema, state, setState, onClose, isIsolatedMode, onToggleIsolation }: QueryBuilderPanelProps) {
  const [activeTab, setActiveTab] = useState<'tables' | 'columns' | 'filters' | 'sorts'>('tables');
  const [sqlPreview, setSqlPreview] = useState<string>('');
  const [queryError, setQueryError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const sql = compileQuery(state, schema);
      setSqlPreview(sql);
      setQueryError(null);
    } catch (err) {
      if (err instanceof UnreachableTableError) {
        setQueryError(`Cannot reach table '${err.tableId}'. Add a manual join or ensure tables are connected.`);
      } else {
        setQueryError((err as Error).message);
      }
      setSqlPreview('');
    }
  }, [state, schema]);

  const updateColumn = (idx: number, updates: Partial<QueryColumn>) => {
    setState(prev => {
      const newCols = [...prev.columns];
      newCols[idx] = { ...newCols[idx], ...updates };
      return { ...prev, columns: newCols };
    });
  };

  const addFilter = () => {
    if (state.tables.length === 0) return;
    const firstTableInstance = state.tables[0];
    const firstCol = schema.find(t => t.name === firstTableInstance.name)?.columns[0]?.name || '';
    
    setState(prev => ({
      ...prev,
      filters: [
        ...prev.filters,
        { id: Math.random().toString(36).substring(7), tableId: firstTableInstance.id, columnName: firstCol, operator: '=', value: '' }
      ]
    }));
  };

  const updateFilter = (idx: number, updates: Partial<QueryFilter>) => {
    setState(prev => {
      const newFilters = [...prev.filters];
      newFilters[idx] = { ...newFilters[idx], ...updates };
      return { ...prev, filters: newFilters };
    });
  };

  const removeFilter = (idx: number) => {
    setState(prev => {
      const newFilters = [...prev.filters];
      newFilters.splice(idx, 1);
      return { ...prev, filters: newFilters };
    });
  };

  const addSort = () => {
    if (state.tables.length === 0) return;
    const firstTableInstance = state.tables[0];
    const firstCol = schema.find(t => t.name === firstTableInstance.name)?.columns[0]?.name || '';

    setState(prev => ({
      ...prev,
      sorts: [
        ...prev.sorts,
        { tableId: firstTableInstance.id, columnName: firstCol, direction: 'ASC' }
      ]
    }));
  };

  const updateSort = (idx: number, updates: Partial<QuerySort>) => {
    setState(prev => {
      const newSorts = [...prev.sorts];
      newSorts[idx] = { ...newSorts[idx], ...updates };
      return { ...prev, sorts: newSorts };
    });
  };

  const removeSort = (idx: number) => {
    setState(prev => {
      const newSorts = [...prev.sorts];
      newSorts.splice(idx, 1);
      return { ...prev, sorts: newSorts };
    });
  };

  const availableColumns = state.tables.flatMap(t => {
    const tableData = schema.find(s => s.name === t.name);
    return tableData ? tableData.columns.map(c => ({ tableId: t.id, tableName: t.name, column: c.name })) : [];
  });

  return (
    <div style={{
      position: 'absolute',
      right: '20px',
      top: '80px',
      bottom: '20px',
      width: '450px',
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      backdropFilter: 'blur(12px)',
      border: '1px solid #222222',
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
      zIndex: 40,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ padding: '1.25rem', borderBottom: '1px solid #222222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#ffffff' }}>Query Builder</span>
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={onToggleIsolation}
            style={{ background: isIsolatedMode ? 'rgba(16, 185, 129, 0.1)' : 'transparent', color: isIsolatedMode ? '#10b981' : '#6b7280', border: isIsolatedMode ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid #333', padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            title="Isolate Selected Tables on Canvas"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            Isolate
          </button>
          {state.tables.length > 0 && (
            <button 
              onClick={() => setState({ tables: [], columns: [], filters: [], sorts: [], manualJoins: [] })}
              style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}
              title="Clear all selections"
            >
              Clear All
            </button>
          )}
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '0.25rem', transition: 'color 0.2s', fontSize: '0.8rem', fontWeight: 600 }} onMouseOver={e => e.currentTarget.style.color = '#fff'} onMouseOut={e => e.currentTarget.style.color = '#6b7280'}>
            Close
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #222222', display: 'flex', gap: '1rem' }}>
          {(['tables', 'columns', 'filters', 'sorts'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #10b981' : '2px solid transparent',
                color: activeTab === tab ? '#10b981' : '#6b7280',
                padding: '0.5rem 0',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.2s'
              }}
            >
              {tab} {tab === 'tables' ? `(${state.tables.length})` : tab === 'columns' ? `(${state.columns.length})` : tab === 'filters' ? `(${state.filters.length})` : `(${state.sorts.length})`}
            </button>
          ))}
        </div>

        <div style={{ padding: '1rem', flex: 1, overflowY: 'auto' }}>
          {state.tables.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem 0' }}>
              Select tables and columns from the canvas to start building a query.
            </div>
          ) : (
            <>
              {activeTab === 'tables' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {state.tables.map((t) => (
                    <div key={t.id} style={{ backgroundColor: '#111111', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: 500 }}>
                        {t.name} <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>({t.id})</span>
                      </div>
                      <button 
                        onClick={() => {
                          const numInstances = state.tables.filter(st => st.name === t.name).length;
                          const newId = `${t.name}_${numInstances + 1}`;
                          setState(prev => ({
                            ...prev,
                            tables: [...prev.tables, { id: newId, name: t.name }]
                          }));
                        }}
                        style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '0.4rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.2)'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.1)'}
                      >
                        Self Join
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'columns' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {state.columns.map((col, idx) => (
                    <div key={idx} style={{ backgroundColor: '#111111', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333333' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: 500 }}>{col.tableId}.{col.columnName}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select
                          value={col.func || ''}
                          onChange={(e) => updateColumn(idx, { func: (e.target.value || undefined) as any })}
                          style={{ flex: 1, backgroundColor: '#000000', color: '#e5e7eb', border: '1px solid #333333', borderRadius: '4px', padding: '0.25rem', fontSize: '0.8rem' }}
                        >
                          <option value="">No function</option>
                          <option value="COUNT">COUNT</option>
                          <option value="SUM">SUM</option>
                          <option value="AVG">AVG</option>
                          <option value="MAX">MAX</option>
                          <option value="MIN">MIN</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Alias AS..."
                          value={col.alias || ''}
                          onChange={(e) => updateColumn(idx, { alias: e.target.value })}
                          style={{ flex: 1, backgroundColor: '#000000', color: '#ffffff', border: '1px solid #333333', borderRadius: '4px', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                        />
                      </div>
                    </div>
                  ))}
                  {state.columns.length === 0 && (
                    <div style={{ color: '#64748b', fontSize: '0.9rem' }}>No columns selected. Query will use SELECT *.</div>
                  )}
                </div>
              )}

              {activeTab === 'filters' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {state.filters.map((filter, idx) => (
                    <div key={filter.id} style={{ backgroundColor: '#111111', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333333', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select
                          value={`${filter.tableId}.${filter.columnName}`}
                          onChange={(e) => {
                            const [tableId, columnName] = e.target.value.split('.');
                            updateFilter(idx, { tableId, columnName });
                          }}
                          style={{ flex: 1, backgroundColor: '#000000', color: '#e5e7eb', border: '1px solid #333333', borderRadius: '4px', padding: '0.25rem', fontSize: '0.8rem' }}
                        >
                          {availableColumns.map(ac => (
                            <option key={`${ac.tableId}.${ac.column}`} value={`${ac.tableId}.${ac.column}`}>
                              {ac.tableId}.{ac.column}
                            </option>
                          ))}
                        </select>
                        <button onClick={() => removeFilter(idx)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
                          X
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select
                          value={filter.operator}
                          onChange={(e) => updateFilter(idx, { operator: e.target.value as any })}
                          style={{ width: '80px', backgroundColor: '#000000', color: '#3b82f6', border: '1px solid #333333', borderRadius: '4px', padding: '0.25rem', fontSize: '0.8rem', fontWeight: 600 }}
                        >
                          <option value="=">=</option>
                          <option value="!=">!=</option>
                          <option value=">">&gt;</option>
                          <option value="<">&lt;</option>
                          <option value=">=">&gt;=</option>
                          <option value="<=">&lt;=</option>
                          <option value="LIKE">LIKE</option>
                          <option value="IN">IN</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Value..."
                          value={filter.value}
                          onChange={(e) => updateFilter(idx, { value: e.target.value })}
                          style={{ flex: 1, backgroundColor: '#000000', color: '#ffffff', border: '1px solid #333333', borderRadius: '4px', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                        />
                      </div>
                    </div>
                  ))}
                  <button onClick={addFilter} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px dashed #10b981', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.25rem', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.2)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.1)'}>
                    Add Filter
                  </button>
                </div>
              )}

              {activeTab === 'sorts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {state.sorts.map((sort, idx) => (
                    <div key={idx} style={{ backgroundColor: '#111111', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333333', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <select
                        value={`${sort.tableId}.${sort.columnName}`}
                        onChange={(e) => {
                          const [tableId, columnName] = e.target.value.split('.');
                          updateSort(idx, { tableId, columnName });
                        }}
                        style={{ flex: 1, backgroundColor: '#000000', color: '#e5e7eb', border: '1px solid #333333', borderRadius: '4px', padding: '0.25rem', fontSize: '0.8rem' }}
                      >
                        {availableColumns.map(ac => (
                          <option key={`${ac.tableId}.${ac.column}`} value={`${ac.tableId}.${ac.column}`}>
                            {ac.tableId}.{ac.column}
                          </option>
                        ))}
                      </select>
                      <select
                        value={sort.direction}
                        onChange={(e) => updateSort(idx, { direction: e.target.value as any })}
                        style={{ width: '80px', backgroundColor: '#000000', color: '#3b82f6', border: '1px solid #333333', borderRadius: '4px', padding: '0.25rem', fontSize: '0.8rem', fontWeight: 600 }}
                      >
                        <option value="ASC">ASC</option>
                        <option value="DESC">DESC</option>
                      </select>
                      <button onClick={() => removeSort(idx)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
                        X
                      </button>
                    </div>
                  ))}
                  <button onClick={addSort} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px dashed #3b82f6', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.25rem', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'}>
                    Add Sort
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* SQL Preview Footer */}
      <div style={{ padding: '1rem', borderTop: '1px solid #222222', backgroundColor: '#000000' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SQL Preview</h4>
        
        {queryError ? (
          <div style={{ color: '#ef4444', fontSize: '0.85rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Error generating query:</strong>
            {queryError}
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <pre style={{ margin: 0, padding: '0.75rem', backgroundColor: '#111111', border: '1px solid #333333', borderRadius: '6px', color: '#e5e7eb', fontSize: '0.8rem', overflowX: 'auto', maxHeight: '150px', fontFamily: 'monospace' }}>
              <code>{sqlPreview || '-- Select tables and columns'}</code>
            </pre>
            {sqlPreview && (
              <button 
                onClick={() => navigator.clipboard.writeText(sqlPreview)}
                style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: '#222222', border: '1px solid #333333', color: '#e5e7eb', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = '#333333'}
                onMouseOut={e => e.currentTarget.style.background = '#222222'}
              >
                Copy
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
