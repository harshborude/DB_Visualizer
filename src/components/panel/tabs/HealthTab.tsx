import type { AnalyzedTableData } from '../../../utils/graphAnalytics';
import { generateNormalizationSuggestions, calculateTableHealthScore } from '../../../utils/normalization';

interface HealthTabProps {
  selectedTable: AnalyzedTableData;
  tables: AnalyzedTableData[];
}

export function HealthTab({ selectedTable, tables }: HealthTabProps) {
  const hasPrimaryKey = selectedTable.primaryKeys && selectedTable.primaryKeys.length > 0;
  const isPartOfCycle = selectedTable.metrics.partOfCycle;
  const isIsolated = selectedTable.metrics.isIsolated;

  const suggestions = generateNormalizationSuggestions(selectedTable, tables);
  const healthScore = calculateTableHealthScore(selectedTable, suggestions);

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#38bdf8'; // sky-400
    if (score >= 70) return '#0ea5e9'; // sky-500
    if (score >= 50) return '#0284c7'; // sky-600
    return '#0369a1'; // sky-700
  };

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Overall Score */}
      <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '8px', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#94a3b8', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Overall Health Score
          </h3>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.95rem' }}>
            Based on graph metrics and normalization heuristics.
          </p>
        </div>
        <div style={{ fontSize: '3rem', fontWeight: 700, color: getScoreColor(healthScore), lineHeight: 1 }}>
          {healthScore}<span style={{ fontSize: '1.5rem', color: '#64748b' }}>/100</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#f8fafc', fontWeight: 600 }}>Structural Checks</h4>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#f8fafc', fontWeight: 600 }}>Normalization & Schema Quality</h4>
        <div style={{ 
          backgroundColor: '#1e293b', 
          padding: '1.25rem', 
          borderRadius: '8px', 
          borderLeft: `4px solid ${suggestions.length === 0 ? '#38bdf8' : '#0ea5e9'}`,
          borderTop: '1px solid #334155',
          borderRight: '1px solid #334155',
          borderBottom: '1px solid #334155',
        }}>
          {suggestions.length === 0 ? (
             <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.5 }}>
               Perfect! No normalization issues or schema redundancies detected.
             </p>
          ) : (
            <>
              <p style={{ margin: '0 0 0.5rem 0', color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Found <strong>{suggestions.length}</strong> potential issue{suggestions.length > 1 ? 's' : ''} impacting health score by a total of <strong>-{suggestions.reduce((sum, s) => sum + s.penaltyScore, 0)} points</strong>.
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                {suggestions.slice(0, 2).map((s, idx) => (
                  <li key={idx} style={{ marginBottom: '0.25rem' }}>{s.title} (-{s.penaltyScore} pts)</li>
                ))}
                {suggestions.length > 2 && (
                  <li>...and {suggestions.length - 2} more</li>
                )}
              </ul>
              <p style={{ margin: '0.75rem 0 0 0', color: '#0ea5e9', fontSize: '0.85rem', fontWeight: 600 }}>
                Check the "Suggestions" tab for detailed breakdown and remedies.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
