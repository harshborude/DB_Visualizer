import React from 'react';
import type { AnalyzedTableData } from '../../../utils/graphAnalytics';

interface OverviewTabProps {
  selectedTable: AnalyzedTableData;
}

export function OverviewTab({ selectedTable }: OverviewTabProps) {
  return (
    <>
      {/* GRAPH ANALYTICS SECTION */}
      <div style={{ marginBottom: '2rem', backgroundColor: '#1e293b', padding: '1.25rem', borderRadius: '12px', border: '1px solid #334155' }}>
        <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path><path d="M3 15h18v-2H3v2z"></path><path d="M3 19h18v-2H3v2z"></path></svg>
          Graph Inferences
        </h4>
        
        <p style={{ margin: 0, fontSize: '0.95rem', color: '#cbd5e1', lineHeight: 1.6 }}>
          {selectedTable.metrics.isIsolated && (
            <span>This is an <strong>Isolated Table</strong>. It has absolutely no relationships to any other tables in the database. It might be a legacy table, a standalone log, or a work-in-progress. </span>
          )}
          {!selectedTable.metrics.isIsolated && selectedTable.metrics.isRoot && (
            <span>This is a <strong>Root Table</strong>. It does not depend on any other tables, making it a foundational entity in your database architecture. </span>
          )}
          {!selectedTable.metrics.isIsolated && selectedTable.metrics.isLeaf && (
            <span>This is a <strong>Leaf Table</strong>. It depends on other tables (like a data-sink), but nothing depends on it. </span>
          )}
          {!selectedTable.metrics.isIsolated && !selectedTable.metrics.isRoot && !selectedTable.metrics.isLeaf && (
            <span>This is a <strong>Core Hub Table</strong>. It heavily connects different parts of the database together. </span>
          )}

          {selectedTable.metrics.incomingDependencies.length > 0 && (
            <span>It is heavily referenced, specifically depended upon by <strong>{selectedTable.metrics.incomingDependencies.join(', ')}</strong>. </span>
          )}
          
          {selectedTable.metrics.outgoingDependencies.length > 0 && (
            <span>It relies on data from <strong>{selectedTable.metrics.outgoingDependencies.join(', ')}</strong>. </span>
          )}

          {selectedTable.metrics.impactRadius > 0 ? (
            <span style={{ display: 'block', marginTop: '0.75rem', color: '#f8fafc' }}>
              <strong style={{ color: '#f59e0b' }}>⚠️ Cascade Risk:</strong> Modifying or deleting this table could potentially impact <strong>{selectedTable.metrics.impactRadius} downstream tables</strong>.
            </span>
          ) : (
            !selectedTable.metrics.isIsolated && (
              <span style={{ display: 'block', marginTop: '0.75rem', color: '#f8fafc' }}>
                <strong style={{ color: '#10b981' }}>✅ Safe to Modify:</strong> Because no other tables depend on this one, structural changes here are unlikely to cause cascading breaks.
              </span>
            )
          )}

          {selectedTable.metrics.partOfCycle && (
            <span style={{ display: 'block', marginTop: '0.75rem', color: '#f8fafc' }}>
              <strong style={{ color: '#ef4444' }}>🚨 Circular Dependency:</strong> This table is part of a cyclic relationship loop. This is generally considered a schema anti-pattern.
            </span>
          )}
        </p>
      </div>

      {selectedTable.foreignKeys && selectedTable.foreignKeys.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Relationships</h4>
          <ul style={{ paddingLeft: '0', margin: '0', listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {selectedTable.foreignKeys.map((fk, i) => (
              <li key={i} style={{ backgroundColor: '#1e293b', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span className="relationship-badge" style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.05em' }}>
                    {fk.relationType}
                  </span>
                </div>
                <div style={{ color: '#cbd5e1', fontSize: '0.9rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <code style={{ color: '#f8fafc', background: '#0f172a', padding: '4px 8px', borderRadius: '4px' }}>{fk.columnNames.join(', ')}</code> 
                  <span style={{ color: '#64748b' }}>&rarr;</span> 
                  <code style={{ color: '#f8fafc', background: '#0f172a', padding: '4px 8px', borderRadius: '4px' }}>{fk.targetTable}({fk.targetColumnNames.join(', ')})</code>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
