import pg from "pg";
import { config } from "./config/index.js";

const { Pool } = pg;

function getDatabaseConnectionString() {
  const url = new URL(config.databaseUrl);
  if (config.databaseSsl) url.searchParams.set("sslmode", "verify-full");
  return url.toString();
}

if (config.nodeEnv === "production" && !config.databaseUrl) {
  throw new Error("DATABASE_URL must be configured when NODE_ENV=production");
}

const pool = config.databaseUrl
  ? new Pool({
      connectionString: getDatabaseConnectionString(),
      ssl: config.databaseSsl ? { rejectUnauthorized: true } : false,
      max: config.databasePoolMax,
      connectionTimeoutMillis: config.databaseConnectionTimeoutMs,
      idleTimeoutMillis: 30_000,
    })
  : new Pool({
      database: "home_cake",
      max: config.databasePoolMax,
      connectionTimeoutMillis: config.databaseConnectionTimeoutMs,
      idleTimeoutMillis: 30_000,
    });

export default pool;
