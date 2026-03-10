import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";

import { env } from "../config/env.js";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
});

export const db = drizzle(pool);

export async function closeDbPool() {
  await pool.end();
}

export function getDbPoolStats() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
}

export async function isDbReady() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}
