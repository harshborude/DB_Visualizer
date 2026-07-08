import { useState, useRef } from 'react'
import { parseSchema, type TableData } from './parser'

function App() {
  const [tables, setTables] = useState<TableData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = async (file: File) => {
    setError(null)
    setIsParsing(true)
    
    try {
      const text = await file.text()
      const parsedTables = await parseSchema(text)
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

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>SchemaLens MVP</h1>
      <p>Upload a PostgreSQL schema.sql dump file to view its tables and attributes.</p>
      
      <div 
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: '2px dashed #ccc',
          borderRadius: '8px',
          padding: '4rem',
          textAlign: 'center',
          cursor: 'pointer',
          marginBottom: '2rem',
          backgroundColor: '#f9f9f9'
        }}
      >
        <p>Drag and drop your schema.sql here, or click to select a file.</p>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".sql" 
          style={{ display: 'none' }} 
        />
      </div>

      {isParsing && <p>Parsing database schema via WASM...</p>}
      
      {error && (
        <div style={{ color: 'red', marginBottom: '1rem', padding: '1rem', border: '1px solid red' }}>
          <strong>Error: </strong> {error}
        </div>
      )}

      {tables.length > 0 && (
        <div>
          <h2>Found {tables.length} Tables:</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {tables.map(table => (
              <div key={table.name} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1rem', minWidth: '250px' }}>
                <h3 style={{ margin: '0 0 1rem 0' }}>{table.name}</h3>
                <ul style={{ paddingLeft: '1.2rem', margin: '0' }}>
                  {table.columns.map(col => (
                    <li key={col.name}>
                      <strong>{col.name}</strong> 
                      <span style={{ color: '#666', marginLeft: '0.5rem', fontSize: '0.9em' }}>{col.type}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
