// Backfill script: ensure every Clerk user has an internal users.id (uuid) row with clerk_user_id mapping.
// Usage:
//  node scripts/backfill-clerk-user-mapping.mjs            (requires CLERK_SECRET_KEY + DATABASE_URL)
// Options:
//  DRY_RUN=1 node scripts/backfill-clerk-user-mapping.mjs  (no writes)
//
// Behavior:
//  - Fetches all Clerk users via Clerk API (paginates)
//  - For each, upserts into public.users on clerk_user_id
//  - Reports counts (created vs updated vs skipped)
//  - Does NOT modify tenant_members; membership events are handled by webhook normally.
//
// Fallback (no CLERK_SECRET_KEY):
//  - Reads newline-delimited Clerk user IDs from STDIN and creates placeholder rows with synthetic email
//
// Safety:
//  - Uses ON CONFLICT to be idempotent
//  - Never deletes existing rows
//
// NOTE: The application now lazily creates a user mapping on first authenticated request. This script is
//       only needed to eagerly backfill historical Clerk users or to recover from earlier missing webhooks.

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
}

const clerkSecret = process.env.CLERK_SECRET_KEY || process.env.CLERK_API_KEY || '';
const dryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('.supabase.co') ? { rejectUnauthorized: false } : false
});

async function fetchClerkUsers() {
    if (!clerkSecret) return null; // caller will fallback
    const users = [];
    let url = 'https://api.clerk.com/v1/users?limit=100';
    while (url) {
        const batch = await new Promise((resolve, reject) => {
            const req = https.request(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${clerkSecret}`,
                    'Content-Type': 'application/json'
                }
            }, res => {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 400) {
                        return reject(new Error(`Clerk API error ${res.statusCode}: ${data}`));
                    }
                    try {
                        const parsed = JSON.parse(data);
                        resolve(parsed);
                    } catch (e) { reject(e); }
                });
            });
            req.on('error', reject);
            req.end();
        });
        if (Array.isArray(batch)) {
            users.push(...batch);
            // Clerk older pagination may not include links; break.
            if (batch.length < 100) break;
            // Attempt to compute next offset parameter if supported
            const offset = users.length;
            url = `https://api.clerk.com/v1/users?limit=100&offset=${offset}`;
        } else if (batch?.data) { // if future response shape { data, total_count }
            users.push(...(batch.data || []));
            if (users.length >= (batch.total_count || 0)) break;
            url = `https://api.clerk.com/v1/users?limit=100&offset=${users.length}`;
        } else {
            break;
        }
    }
    return users;
}

function extractPrimaryEmail(u) {
    const primaryId = u.primary_email_address_id;
    const emails = u.email_addresses || [];
    const primary = emails.find(e => e.id === primaryId) || emails[0];
    return (primary?.email_address || `${u.id}@placeholder.local`).toLowerCase();
}

async function upsertUser(user) {
    const email = extractPrimaryEmail(user);
    const first = user.first_name || null;
    const last = user.last_name || null;
    const avatar = user.image_url || null;
    if (dryRun) return { created: false, updated: false, skipped: true };
    const sql = `insert into public.users (id, email, first_name, last_name, avatar_url, clerk_user_id)
               values (gen_random_uuid(), $1,$2,$3,$4,$5)
               on conflict (clerk_user_id) do update
               set email = excluded.email,
                   first_name = excluded.first_name,
                   last_name = excluded.last_name,
                   avatar_url = excluded.avatar_url,
                   updated_at = now()
               returning (xmax = 0) as inserted`;
    const { rows } = await pool.query(sql, [email, first, last, avatar, user.id]);
    return { created: !!rows[0]?.inserted, updated: !rows[0]?.inserted };
}

async function main() {
    console.log('▶ Backfilling Clerk user mappings');
    console.log('DRY_RUN:', dryRun);
    let users = await fetchClerkUsers();
    if (!users) {
        console.log('No Clerk secret provided. Reading Clerk user IDs from STDIN (one per line)...');
        const input = await new Promise(r => {
            let buf = '';
            process.stdin.setEncoding('utf8');
            process.stdin.on('data', d => buf += d);
            process.stdin.on('end', () => r(buf));
        });
        const ids = input.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        users = ids.map(id => ({ id, email_addresses: [], primary_email_address_id: null }));
    }
    console.log(`Fetched ${users.length} Clerk users`);
    let created = 0, updated = 0, skipped = 0;
    for (const u of users) {
        try {
            const res = await upsertUser(u);
            if (res.skipped) skipped++; else if (res.created) created++; else if (res.updated) updated++;
        } catch (err) {
            console.error('Failed upserting user', u.id, err.message);
        }
    }
    console.log('Summary:', { created, updated, skipped });
    await pool.end();
    console.log('✅ Backfill complete');
}

main().catch(err => { console.error(err); process.exit(1); });
