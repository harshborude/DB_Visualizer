import { useState, useMemo } from 'react';
import type { AnalyzedTableData } from '../../utils/graphAnalytics';
import type { PathfinderStrategy } from '../../utils/pathfinder';

interface PathfinderModalProps {
  tables: AnalyzedTableData[];
  onClose: () => void;
  onFindPath: (sourceTable: string, targetTable: string, strategy: PathfinderStrategy) => void;
}

export function PathfinderModal({ tables, onClose, onFindPath }: PathfinderModalProps) {
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [sourceFocused, setSourceFocused] = useState(false);
  const [targetFocused, setTargetFocused] = useState(false);
  const [strategy, setStrategy] = useState<PathfinderStrategy>('indexed');

  const tableNames = useMemo(() => tables.map(t => t.name), [tables]);

  const filteredSource = useMemo(() => 
    tableNames.filter(n => n.toLowerCase().includes(source.toLowerCase())),
  [tableNames, source]);

  const filteredTarget = useMemo(() => 
    tableNames.filter(n => n.toLowerCase().includes(target.toLowerCase())),
  [tableNames, target]);

  const handleFind = () => {
    if (source && target) {
      onFindPath(source, target, strategy);
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        padding: '2rem',
        borderRadius: '12px',
        border: '1px solid #334155',
        width: '400px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.25rem' }}>Find Join Path</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div style={{ marginBottom: '1rem', position: 'relative' }}>
          <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Source Table</label>
          <input 
            type="text" 
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onFocus={() => setSourceFocused(true)}
            onBlur={() => setTimeout(() => setSourceFocused(false), 200)}
            placeholder="e.g. users"
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#f8fafc',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          {sourceFocused && filteredSource.length > 0 && (
            <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', margin: 0, padding: 0, listStyle: 'none', maxHeight: '150px', overflowY: 'auto', zIndex: 10 }}>
              {filteredSource.map(name => (
                <li 
                  key={name} 
                  onClick={() => { setSource(name); setSourceFocused(false); }}
                  style={{ padding: '0.5rem 0.75rem', color: '#cbd5e1', cursor: 'pointer', borderBottom: '1px solid #1e293b' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ marginBottom: '2rem', position: 'relative' }}>
          <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Target Table</label>
          <input 
            type="text" 
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onFocus={() => setTargetFocused(true)}
            onBlur={() => setTimeout(() => setTargetFocused(false), 200)}
            placeholder="e.g. orders"
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#f8fafc',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          {targetFocused && filteredTarget.length > 0 && (
            <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', margin: 0, padding: 0, listStyle: 'none', maxHeight: '150px', overflowY: 'auto', zIndex: 10 }}>
              {filteredTarget.map(name => (
                <li 
                  key={name} 
                  onClick={() => { setTarget(name); setTargetFocused(false); }}
                  style={{ padding: '0.5rem 0.75rem', color: '#cbd5e1', cursor: 'pointer', borderBottom: '1px solid #1e293b' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Pathfinding Strategy</label>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: strategy === 'indexed' ? '#10b981' : '#94a3b8', cursor: 'pointer', transition: 'color 0.2s', fontSize: '0.9rem' }}>
              <input 
                type="radio" 
                value="indexed" 
                checked={strategy === 'indexed'} 
                onChange={() => setStrategy('indexed')}
                style={{ accentColor: '#10b981' }}
              />
              ⚡ Optimized (Prefer Indexes)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: strategy === 'shortest' ? '#3b82f6' : '#94a3b8', cursor: 'pointer', transition: 'color 0.2s', fontSize: '0.9rem' }}>
              <input 
                type="radio" 
                value="shortest" 
                checked={strategy === 'shortest'} 
                onChange={() => setStrategy('shortest')}
                style={{ accentColor: '#3b82f6' }}
              />
              📏 Shortest Path (Fewer Joins)
            </label>
          </div>
        </div>

        <button 
          onClick={handleFind}
          disabled={!source || !target}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: (source && target) ? '#0ea5e9' : '#334155',
            color: (source && target) ? '#fff' : '#94a3b8',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: (source && target) ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.2s'
          }}
        >
          Find Path
        </button>
      </div>
    </div>
  );
}
