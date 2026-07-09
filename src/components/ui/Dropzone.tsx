import React, { useRef } from 'react';

interface DropzoneProps {
  onFileAccepted: (file: File) => void;
  isParsing: boolean;
  error: string | null;
}

export function Dropzone({ onFileAccepted, isParsing, error }: DropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFetchingSample, setIsFetchingSample] = React.useState(false);

  const loadSampleDatabase = async () => {
    setIsFetchingSample(true);
    try {
      const response = await fetch('/postgresql_100_table_dump.sql');
      if (!response.ok) throw new Error("Failed to fetch sample database");
      const sqlText = await response.text();
      const sampleFile = new File([sqlText], 'postgresql_100_table_dump.sql', { type: 'text/plain' });
      onFileAccepted(sampleFile);
    } catch (err) {
      console.error("Failed to load sample database:", err);
    } finally {
      setIsFetchingSample(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileAccepted(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      onFileAccepted(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#0f172a' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem', maxWidth: '800px', margin: '0 auto 3rem auto' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 700, margin: '0 0 1.5rem 0', letterSpacing: '-0.025em' }}>
          <span style={{ color: '#38bdf8' }}>ERDiagram</span>
        </h1>
        
        <p style={{ color: '#e2e8f0', fontSize: '1.25rem', marginBottom: '2rem', lineHeight: 1.6, fontWeight: 500 }}>
          A powerful tool for developers to instantly visualize, understand, and optimize large database schemas.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', textAlign: 'left', marginBottom: '2rem' }}>
          
          <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc', fontSize: '1.1rem' }}>Privacy First</h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Your database schema never leaves your machine. All parsing and graph analytics happen entirely locally in your browser.
            </p>
          </div>

          <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc', fontSize: '1.1rem' }}>Instant Visualization</h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Upload massive SQL dumps to instantly generate a clean, interactive canvas. Traverse complex dependencies effortlessly.
            </p>
          </div>

          <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc', fontSize: '1.1rem' }}>Schema Intelligence</h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Get automated suggestions about database normalization, structural redundancies, circular dependencies, and isolated tables.
            </p>
          </div>

        </div>
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
        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 1.5rem 0' }}>or click to browse from your computer</p>
        
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem', backgroundColor: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '12px', color: '#38bdf8' }}>PostgreSQL</span>
          <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem', backgroundColor: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '12px', color: '#38bdf8' }}>MySQL</span>
          <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem', backgroundColor: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '12px', color: '#38bdf8' }}>SQLite</span>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".sql" 
          style={{ display: 'none' }} 
        />
      </div>

      {isFetchingSample || isParsing ? (
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
          <span>{isFetchingSample ? 'Downloading sample database...' : 'Parsing database schema...'}</span>
        </div>
      ) : (
        <button 
          onClick={loadSampleDatabase}
          style={{ 
            marginTop: '2rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: 'transparent',
            color: '#cbd5e1',
            border: '1px solid #334155',
            borderRadius: '8px',
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#1e293b';
            e.currentTarget.style.color = '#f8fafc';
            e.currentTarget.style.borderColor = '#475569';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#cbd5e1';
            e.currentTarget.style.borderColor = '#334155';
          }}
        >
          Don't have one? Load sample database
        </button>
      )}
      
      {error && (
        <div style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', marginTop: '2rem', padding: '1rem 1.5rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', maxWidth: '600px', width: '100%' }}>
          <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Error Parsing File:</strong> {error}
        </div>
      )}
    </div>
  );
}
