import type { AnalyzedTableData } from '../../../utils/graphAnalytics';

interface ImpactTabProps {
  selectedTable: AnalyzedTableData;
}

export function ImpactTab({ selectedTable }: ImpactTabProps) {
  const { metrics } = selectedTable;
  const { inDegree, impactRadius, componentSize } = metrics;

  const impactPercentage = componentSize > 1 ? Math.round((impactRadius / (componentSize - 1)) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '8px', border: '1px solid #334155', textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#94a3b8', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Blast Radius
        </h3>
        <div style={{ fontSize: '3rem', fontWeight: 700, color: impactRadius > 5 ? '#0ea5e9' : '#38bdf8', lineHeight: 1 }}>
          {impactRadius}
        </div>
        <p style={{ margin: '0.5rem 0 0 0', color: '#cbd5e1', fontSize: '0.9rem' }}>
          downstream tables affected
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ backgroundColor: '#1e293b', padding: '1.25rem', borderRadius: '8px', border: '1px solid #334155' }}>
          <h4 style={{ margin: '0 0 0.25rem 0', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Direct Dependents
          </h4>
          <div style={{ fontSize: '1.75rem', fontWeight: 600, color: '#f8fafc' }}>
            {inDegree}
          </div>
        </div>

        <div style={{ backgroundColor: '#1e293b', padding: '1.25rem', borderRadius: '8px', border: '1px solid #334155' }}>
          <h4 style={{ margin: '0 0 0.25rem 0', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Subsystem Impact
          </h4>
          <div style={{ fontSize: '1.75rem', fontWeight: 600, color: '#f8fafc' }}>
            {impactPercentage}%
          </div>
        </div>
      </div>

      <div style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: 1.6, backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid #38bdf8' }}>
        <strong>What does this mean?</strong>
        <p style={{ margin: '0.5rem 0 0 0' }}>
          If you modify or drop the <strong>{selectedTable.name}</strong> table, it directly breaks {inDegree} table(s) that reference it. 
          Due to transitive dependencies, a total of {impactRadius} table(s) will be affected down the chain.
          This table supports {impactPercentage}% of its local database subsystem (island).
        </p>
      </div>
    </div>
  );
}
