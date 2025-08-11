import { Pool, QueryResult, QueryResultRow } from 'pg';

const { DATABASE_URL = '' } = process.env;
// Treat Supabase cloud as SSL (no-verify), local (localhost/127.0.0.1:54322) as non-SSL
const isLocal =
    DATABASE_URL.includes('127.0.0.1') ||
    DATABASE_URL.includes('localhost') ||
    DATABASE_URL.includes(':54322');

export const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: isLocal ? undefined : { rejectUnauthorized: false }, // fixes SELF_SIGNED_CERT_IN_CHAIN on Windows
});

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
    const client = await pool.connect();
    try {
        return await client.query<T>(text, params);
    } finally {
        client.release();
    }
}