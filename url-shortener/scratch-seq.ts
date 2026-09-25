import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';

async function main() {
  const pool = new Pool({ connectionString: "postgresql://postgres:postgres@localhost:5432/url_shortener" });
  const db = drizzle(pool);
  const result = await db.execute(sql`SELECT nextval('urls_id_seq')`);
  console.log(result.rows[0]);
  pool.end();
}
main().catch(console.error);
