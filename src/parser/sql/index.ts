import { parsePostgresSql } from './postgresql/parser';
import { convertPostgresAstToSchema } from './postgresql/converter';
import { parseMySql } from './mysql/parser';
import { convertMySqlAstToSchema } from './mysql/converter';
import { parseSqlite } from './sqlite/parser';
import { convertSqliteAstToSchema } from './sqlite/converter';
import type { TableData } from '../../types/schema';

// Helper to guess dialect based on specific keywords
function guessDialect(sql: string): 'sqlite' | 'mysql' | 'postgres' {
  // Common SQLite specific tokens
  if (/PRAGMA /i.test(sql) || 
      /AUTOINCREMENT/i.test(sql) || 
      /sqlite_sequence/i.test(sql)) {
    return 'sqlite';
  }

  // Common MySQL specific tokens
  if (/ENGINE=[a-zA-Z0-9_]+/i.test(sql) || 
      /AUTO_INCREMENT/i.test(sql) || 
      /`.*?`/.test(sql) ||
      /\/\*!40101/.test(sql)) {
    return 'mysql';
  }
  
  // Default to postgres if no specific syntax is found
  return 'postgres';
}

export async function processSchema(sql: string): Promise<TableData[]> {
  const dialect = guessDialect(sql);
  
  if (dialect === 'sqlite') {
    try {
      console.log('[parser] Detected SQLite dialect.');
      const ast = await parseSqlite(sql);
      return convertSqliteAstToSchema(ast);
    } catch (e) {
      console.warn('[parser] SQLite parser failed, falling back to Postgres parser...', e);
      const pgAst = await parsePostgresSql(sql);
      return convertPostgresAstToSchema(pgAst);
    }
  } else if (dialect === 'mysql') {
    try {
      console.log('[parser] Detected MySQL dialect.');
      const ast = await parseMySql(sql);
      return convertMySqlAstToSchema(ast);
    } catch (e) {
      console.warn('[parser] MySQL parser failed, falling back to Postgres parser...', e);
      const pgAst = await parsePostgresSql(sql);
      return convertPostgresAstToSchema(pgAst);
    }
  } else {
    try {
      console.log('[parser] Detected Postgres dialect.');
      const pgAst = await parsePostgresSql(sql);
      return convertPostgresAstToSchema(pgAst);
    } catch (e) {
      console.warn('[parser] Postgres parser failed, falling back to MySQL parser...', e);
      const ast = await parseMySql(sql);
      return convertMySqlAstToSchema(ast);
    }
  }
}
