import type { AnalyzedTableData } from '../../../utils/graphAnalytics';

interface HealthTabProps {
  selectedTable: AnalyzedTableData;
}

export function HealthTab({ selectedTable }: HealthTabProps) {
  const hasPrimaryKey = selectedTable.primaryKeys && selectedTable.primaryKeys.length > 0;
  const isPartOfCycle = selectedTable.metrics.partOfCycle;
  const isIsolated = selectedTable.metrics.isIsolated;

  const checks = [
    {
      title: 'Primary Key',
      status: hasPrimaryKey ? 'pass' : 'fail',
      message: hasPrimaryKey 
        ? 'Table has a primary key defined. Primary keys are crucial for health because they guarantee row uniqueness and dramatically improve query performance, especially during joins or lookups.' 
        : 'Missing primary key. This negatively impacts health because without a primary key, the database cannot efficiently locate specific rows, slowing down updates and risking data duplication.',
    },
    {
      title: 'Circular Dependencies',
      status: !isPartOfCycle ? 'pass' : 'fail',
      message: !isPartOfCycle 
        ? 'No circular dependencies detected. This maintains a healthy, clear hierarchy for data insertion and deletion.' 
        : 'Table is part of a cyclic relationship loop. This degrades health because it creates tight coupling, meaning you often cannot insert or delete data without temporarily disabling constraints or using complex deferred transactions.',
    },
    {
      title: 'Connectivity',
      status: !isIsolated ? 'pass' : 'warn',
      message: !isIsolated 
        ? 'Table is structurally integrated with the rest of the schema.' 
        : 'Table is completely isolated with no incoming or outgoing foreign keys. While this might be intentional for simple logs or settings, it often degrades health by leaving "orphaned" data that isn\'t constrained by the main relational model.',
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {checks.map((check, i) => {
        const borderColor = check.status === 'pass' ? '#38bdf8' : check.status === 'fail' ? '#0ea5e9' : '#0284c7';
        return (
          <div key={i} style={{ 
            backgroundColor: '#1e293b', 
            padding: '1.25rem', 
            borderRadius: '8px', 
            borderLeft: `4px solid ${borderColor}`,
            borderTop: '1px solid #334155',
            borderRight: '1px solid #334155',
            borderBottom: '1px solid #334155',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc', fontWeight: 600 }}>{check.title}</h4>
            </div>
            <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.5 }}>
              {check.message}
            </p>
          </div>
        );
      })}
    </div>
  );
}
