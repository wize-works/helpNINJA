import { Pool, QueryResult, QueryResultRow, PoolConfig } from 'pg';
import { setDefaultResultOrder, resolve4, resolve6 } from 'node:dns';

// Prefer IPv4 to avoid ENETUNREACH in IPv6-restricted clusters
try { setDefaultResultOrder('ipv4first'); } catch { /* no-op */ }

const { DATABASE_URL = '' } = process.env;

// Optional: pin IPv4 host if provided (bypasses DNS entirely)
let connectionString = DATABASE_URL;
if (process.env.DB_HOST_IPV4) {
    try {
        const u = new URL(DATABASE_URL);
        u.hostname = process.env.DB_HOST_IPV4;
        connectionString = u.toString();
    } catch {
        // fall back to original DATABASE_URL
    }
}

// Treat Supabase cloud as SSL (no-verify), local (localhost/127.0.0.1:54322) as non-SSL
const isLocal =
    DATABASE_URL.includes('127.0.0.1') ||
    DATABASE_URL.includes('localhost') ||
    DATABASE_URL.includes(':54322');

// Optional one-time DNS debug (set DEBUG_DB_RESOLUTION=1)
if (process.env.DEBUG_DB_RESOLUTION === '1') {
    try {
        const host = new URL(DATABASE_URL).hostname;
        resolve4(host, (e, a) => console.warn('DB resolve4', host, e?.message ?? null, a ?? []));
        resolve6(host, (e, a) => console.warn('DB resolve6', host, e?.message ?? null, a ?? []));
    } catch { /* ignore */ }
}

const cfg: PoolConfig = {
    connectionString,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
    application_name: 'helpninja',
    keepAlive: true,
};

export const pool = new Pool(cfg);

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
    const client = await pool.connect();
    try {
        return await client.query<T>(text, params);
    } finally {
        client.release();
    }
}