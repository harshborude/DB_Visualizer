import sqlParser from 'node-sql-parser';
const { Parser } = sqlParser;

export async function parseSqlite(sql: string): Promise<any> {
  console.log(`[sqlite-parser] Attempting to parse SQL payload of length: ${sql.length}`)
  
  // Pre-process: node-sql-parser chokes on PRAGMA and TRANSACTION boundaries
  const cleanedSql = sql
    .replace(/PRAGMA\s+.*?;/gi, '')
    .replace(/BEGIN(\s+TRANSACTION)?\s*;/gi, '')
    .replace(/COMMIT\s*;/gi, '');

  const parser = new Parser()
  
  try {
    const ast = parser.astify(cleanedSql, { database: 'sqlite' })
    console.log(`[sqlite-parser] Parsing completed successfully.`)
    return ast
  } catch (err: any) {
    console.error(`[sqlite-parser] Exception thrown during parse:`, err)
    throw new Error(`SQLite Parse Exception: ${err.message}`)
  }
}
