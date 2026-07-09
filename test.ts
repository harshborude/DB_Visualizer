import fs from 'fs';
import { processSchema } from './src/parser/sql/index.ts';

async function run() {
  console.log('Testing MySQL...');
  try {
    const file1 = fs.readFileSync('C:\\Users\\METHEI\\Downloads\\mysqlsampledatabase.sql', 'utf8');
    const res1 = await processSchema(file1);
    console.log('Success MySQL, tables:', res1.length);
  } catch (e) {
    console.error('Error MySQL:', e);
  }
  
  console.log('\nTesting Postgres...');
  try {
    const file2 = fs.readFileSync('C:\\Users\\METHEI\\Desktop\\dvdrental.sql', 'utf8');
    const res2 = await processSchema(file2);
    console.log('Success Postgres, tables:', res2.length);
  } catch (e) {
    console.error('Error Postgres:', e);
  }
}

run();
