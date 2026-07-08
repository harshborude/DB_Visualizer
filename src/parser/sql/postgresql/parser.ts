// @ts-ignore
import Module from 'pg-query-emscripten'

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

export async function parsePostgresSql(sql: string): Promise<any> {
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

  return result.parse_tree;
}
