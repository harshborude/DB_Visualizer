// @ts-ignore
import Module from 'pg-query-emscripten'

export type ColumnData = {
  name: string
  type: string
}

export type TableData = {
  name: string
  columns: ColumnData[]
}

const sanitizePgDumpMetaCommands = (sql: string): string =>
  sql
    .split('\n')
    .map((line) => {
      if (!line.startsWith('\\restrict') && !line.startsWith('\\unrestrict')) {
        return line
      }

      const endsWithCarriageReturn = line.endsWith('\r')
      const contentLength = endsWithCarriageReturn
        ? line.length - 1
        : line.length
      const padding = ' '.repeat(contentLength)

      return endsWithCarriageReturn ? `${padding}\r` : padding
    })
    .join('\n')

const stripCopyData = (sql: string): string => {
  // pg_dump includes data rows between 'COPY ... FROM stdin;' and '\.'
  // We strip this out because we only care about schema, and massive data blocks crash the WASM parser.
  return sql.replace(/COPY .*? FROM stdin;\r?\n[\s\S]*?\r?\n\\\./g, '-- STRIPPED COPY DATA')
}

export async function parseSchema(sql: string): Promise<TableData[]> {
  console.log(`[parser] Initializing WASM Module...`)
  let pgQuery: any;
  try {
    pgQuery = await new Module({
      wasmMemory: new WebAssembly.Memory({
        initial: 2048, // 128MB
        maximum: 8192, // 512MB
      }),
    })
    console.log(`[parser] WASM Module initialized successfully.`)
  } catch (err) {
    console.error(`[parser] Failed to initialize WASM module:`, err)
    throw new Error(`WASM initialization failed: ${err}`)
  }
  
  console.log(`[parser] Attempting to parse SQL payload of length: ${sql.length}`)
  const noDataSql = stripCopyData(sql)
  console.log(`[parser] Stripped COPY data. New payload length: ${noDataSql.length}`)
  
  const sanitizedSql = sanitizePgDumpMetaCommands(noDataSql)
  
  let result: any;
  try {
    result = pgQuery.parse(sanitizedSql)
    console.log(`[parser] pgQuery.parse(sql) completed without throwing an exception.`)
  } catch (err) {
    console.error(`[parser] Exception thrown during pgQuery.parse:`, err)
    throw new Error(`Parse Exception: ${err}`)
  }
  
  if (result.error) {
    console.error("[parser] Result contained an error object:", result.error)
    throw new Error(result.error.message)
  }

  console.log(`[parser] Parse successful. AST contains ${result.parse_tree?.stmts?.length || 0} statements.`)

  const tables: TableData[] = []
  
  // The structure of the result is result.parse_tree.stmts array.
  // Each stmt has a RawStmt which has a stmt property which holds the actual node type (e.g., CreateStmt).
  const stmts = result.parse_tree?.stmts || []

  for (const item of stmts) {
    const rawStmt = item.stmt
    if (!rawStmt) continue

    if (rawStmt.CreateStmt) {
      const createStmt = rawStmt.CreateStmt
      const tableName = createStmt.relation?.relname
      if (!tableName) continue
      
      const columns: ColumnData[] = []
      
      for (const tableElt of createStmt.tableElts || []) {
        if (tableElt.ColumnDef) {
          const colDef = tableElt.ColumnDef
          const colName = colDef.colname
          
          // Type names are deeply nested (e.g. TypeName.names[0].String.sval)
          let colType = "unknown"
          if (colDef.typeName?.names) {
            const nameParts = colDef.typeName.names.map((n: any) => n.String?.sval).filter(Boolean)
            colType = nameParts.join(".")
          }
          
          columns.push({
            name: colName,
            type: colType
          })
        }
      }
      
      tables.push({
        name: tableName,
        columns
      })
    }
  }

  return tables
}
