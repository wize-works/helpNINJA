import { Pool, QueryResult, QueryResultRow } from 'pg';
import dns from 'node:dns';

// Prefer IPv4 to avoid ENETUNREACH in IPv6-restricted clusters
if (typeof dns.setDefaultResultOrder === 'function') {
    try { dns.setDefaultResultOrder('ipv4first'); } catch { /* no-op */ }
}

const { DATABASE_URL = '' } = process.env;
// Treat Supabase cloud as SSL (no-verify), local (localhost/127.0.0.1:54322) as non-SSL
const isLocal =
    DATABASE_URL.includes('127.0.0.1') ||
    DATABASE_URL.includes('localhost') ||
    DATABASE_URL.includes(':54322');

export const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: isLocal ? undefined : { rejectUnauthorized: false }, // fixes SELF_SIGNED_CERT_IN_CHAIN on Windows
    max: 10,                    // Maximum connections in pool
    idleTimeoutMillis: 30000,   // Close idle connections after 30s
    connectionTimeoutMillis: 5000,  // Timeout new connections after 5s
});

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
    try {
        const client = await pool.connect();
        try {
            return await client.query<T>(text, params);
        } catch (error) {
            console.error('Database query error:', error);
            throw error; // rethrow to handle upstream
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Database query error:', error);
        throw error; // rethrow to handle upstream
    }
}

export async function transaction<T>(callback: (query: (text: string, params?: unknown[]) => Promise<QueryResult>) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const txQuery = (text: string, params?: unknown[]) => client.query(text, params);
        const result = await callback(txQuery);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Transaction error:', error);
        throw error;
    } finally {
        client.release();
    }
}