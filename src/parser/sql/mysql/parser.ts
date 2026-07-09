import sqlParser from 'node-sql-parser';
const { Parser } = sqlParser;

export async function parseMySql(sql: string): Promise<any> {
  console.log(`[mysql-parser] Attempting to parse SQL payload of length: ${sql.length}`)
  const parser = new Parser()
  
  try {
    // node-sql-parser can parse an entire file into an AST array
    // We specify database: 'mysql' to handle MySQL-specific syntax
    const ast = parser.astify(sql, { database: 'mysql' })
    console.log(`[mysql-parser] Parsing completed successfully.`)
    return ast
  } catch (err: any) {
    console.error(`[mysql-parser] Exception thrown during parse:`, err)
    throw new Error(`MySQL Parse Exception: ${err.message}`)
  }
}
