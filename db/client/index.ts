import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getDatabaseEnv } from "@/lib/env";
import * as schema from "@/db/schema";

let dbClient: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!dbClient) {
    const sql = neon(getDatabaseEnv().DATABASE_URL);
    dbClient = drizzle(sql, { schema });
  }

  return dbClient;
}
