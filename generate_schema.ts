import fs from 'fs';

export function generateSchema(numTables: number, maxFksPerTable: number = 3): string {
  let sql = '';
  
  for (let i = 1; i <= numTables; i++) {
    sql += `CREATE TABLE table_${i} (\n`;
    sql += `  id INT PRIMARY KEY,\n`;
    sql += `  name VARCHAR(255) NOT NULL,\n`;
    sql += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  value_${i} INT\n`;
    sql += `);\n\n`;
  }

  // Create FKs to make it a connected graph
  for (let i = 2; i <= numTables; i++) {
    // connect to a previous table to ensure some long chains
    let target = i - 1; 
    sql += `ALTER TABLE table_${i} ADD CONSTRAINT fk_${i}_${target} FOREIGN KEY (value_${i}) REFERENCES table_${target} (id);\n`;
    
    // add additional random edges
    let numEdges = Math.floor(Math.random() * maxFksPerTable);
    for(let e = 0; e < numEdges; e++) {
        let t = Math.floor(Math.random() * numTables) + 1;
        if(t !== i) {
            sql += `ALTER TABLE table_${i} ADD CONSTRAINT fk_extra_${i}_${t}_${e} FOREIGN KEY (value_${i}) REFERENCES table_${t} (id);\n`;
        }
    }
  }

  return sql;
}

const num1 = 100;
fs.writeFileSync('postgresql_100_table_dump.sql', generateSchema(num1, 2));
console.log(`Generated postgresql_100_table_dump.sql`);

const num2 = 500;
fs.writeFileSync('postgresql_500_table_dump.sql', generateSchema(num2, 2));
console.log(`Generated postgresql_500_table_dump.sql`);

const num3 = 1000;
fs.writeFileSync('postgresql_1000_table_dump.sql', generateSchema(num3, 2));
console.log(`Generated postgresql_1000_table_dump.sql`);
