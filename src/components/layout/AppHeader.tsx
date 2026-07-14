import React from 'react';
import type { AnalyzedTableData } from '../../utils/graphAnalytics';
import { getLayoutedElements } from '../../utils/layout';
import { type Node, type Edge } from 'reactflow';

interface AppHeaderProps {
  isQueryBuilderMode: boolean;
  tables: AnalyzedTableData[];
  isMobile: boolean;
  isParsing: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  setTables: (tables: AnalyzedTableData[]) => void;
  setPathResult: (result: any) => void;
  setIsPathfinderModalOpen: (open: boolean) => void;
  toggleQueryBuilder: () => void;
  autoLayout: () => void;
}

export function AppHeader({
  isQueryBuilderMode,
  tables,
  isMobile,
  isParsing,
  fileInputRef,
  handleFileChange,
  setTables,
  setPathResult,
  setIsPathfinderModalOpen,
  toggleQueryBuilder,
  autoLayout
}: AppHeaderProps) {
  const isQb = isQueryBuilderMode;

  return (
    <div style={{
      padding: '0.5rem 2rem',
      backgroundColor: isQb ? 'rgba(0, 0, 0, 0.95)' : 'rgba(30, 41, 59, 0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: isQb ? '1px solid #222' : '1px solid #1e293b',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      transition: 'background-color 0.3s ease, border-color 0.3s ease'
    }}>
      <h2
        onClick={() => { setTables([]); setPathResult(null); }}
        style={{
          margin: 0,
          fontSize: '1.25rem',
          fontWeight: 600,
          color: isQb ? '#ffffff' : '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          transition: 'opacity 0.2s ease',
        }}
        onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
        onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
      >
        {isQb ? (
          <><span style={{ color: '#10b981' }}>Query</span> <span style={{ color: '#3b82f6' }}>Builder</span></>
        ) : (
          <><span style={{ color: '#38bdf8' }}>ERDiagram</span> Canvas</>
        )}
      </h2>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {tables.length > 0 && !isQueryBuilderMode && (
          <button
            onClick={() => setIsPathfinderModalOpen(true)}
            style={{
              padding: '0.4rem 1rem',
              cursor: 'pointer',
              backgroundColor: '#0369a1',
              border: '1px solid #0284c7',
              color: '#fff',
              borderRadius: '6px',
              transition: 'all 0.2s ease',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0369a1'}
          >
            {!isMobile && "Extract Data (Pathfinder)"}
          </button>
        )}

        {tables.length > 0 && (
          <button
            onClick={toggleQueryBuilder}
            style={{
              padding: '0.4rem 1rem',
              cursor: 'pointer',
              backgroundColor: isQueryBuilderMode ? '#0ea5e9' : 'transparent',
              border: '1px solid #0ea5e9',
              color: isQueryBuilderMode ? '#fff' : '#0ea5e9',
              borderRadius: '6px',
              transition: 'all 0.2s ease',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem'
            }}
            onMouseOver={(e) => {
              if (!isQueryBuilderMode) {
                e.currentTarget.style.backgroundColor = 'rgba(14, 165, 233, 0.1)';
              }
            }}
            onMouseOut={(e) => {
              if (!isQueryBuilderMode) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {!isMobile && (isQueryBuilderMode ? 'Exit Query Builder' : 'Query Builder')}
          </button>
        )}
        {tables.length > 0 && (
          <button
            onClick={autoLayout}
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
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
            {!isMobile && "Auto Layout"}
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
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          {!isMobile && "Upload New File"}
        </button>
      </div>
    </div>
  );
}
