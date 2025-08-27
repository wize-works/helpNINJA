#!/usr/bin/env node
// Backfill script: infer and populate site_id for conversations and messages.
// Conversations Strategy:
// 1. If conversation.site_id already set, leave it.
// 2. Otherwise attempt to infer from messages.site_id (most frequent non-null)
// 3. Skip if no inference available (no escalations.site_id column exists to leverage).
// Messages Strategy:
// 1. After conversations filled, set messages.site_id = conversations.site_id where NULL.
// Safe to re-run (idempotent) because we only update NULL site_id rows.

import 'dotenv/config'
import { Pool } from 'pg'

const { DATABASE_URL = '' } = process.env
if (!DATABASE_URL) {
    console.error('DATABASE_URL required')
    process.exit(1)
}

const isLocal = DATABASE_URL.includes('127.0.0.1') || DATABASE_URL.includes('localhost') || DATABASE_URL.includes(':54322')
const pool = new Pool({ connectionString: DATABASE_URL, ssl: isLocal ? undefined : { rejectUnauthorized: false } })

async function main() {
    console.log('🔄 Backfilling conversations.site_id ...')
    const beforeNull = await pool.query(`select count(*)::int as c from public.conversations where site_id is null`)
    console.log('Conversations with NULL site_id (before):', beforeNull.rows[0].c)

    // Set-based UPDATE using inference from messages only (escalations table lacks site_id)
    const sql = `WITH inferred AS (
      SELECT c.id as conversation_id,
             (
               SELECT m2.site_id FROM public.messages m2
               WHERE m2.conversation_id = c.id AND m2.site_id IS NOT NULL
               GROUP BY m2.site_id
               ORDER BY COUNT(*) DESC
               LIMIT 1
             ) AS site_id_from_messages
      FROM public.conversations c
      WHERE c.site_id IS NULL
    )
    UPDATE public.conversations c
    SET site_id = i.site_id_from_messages
    FROM inferred i
    WHERE c.id = i.conversation_id
      AND c.site_id IS NULL
      AND i.site_id_from_messages IS NOT NULL;`

    const start = Date.now()
    const result = await pool.query(sql)
    console.log(`Updated rows: ${result.rowCount}`)
    console.log(`Duration: ${(Date.now() - start)}ms`)

    const afterNull = await pool.query(`select count(*)::int as c from public.conversations where site_id is null`)
    console.log('Conversations with NULL site_id (after):', afterNull.rows[0].c)

    if (afterNull.rows[0].c === beforeNull.rows[0].c) {
        console.log('ℹ️ No additional conversation site_ids inferred (either already backfilled or no messages with site_id).')
    } else {
        console.log('✅ Conversation backfill completed.')
    }

    // Messages backfill
    console.log('\n🔄 Backfilling messages.site_id from conversations.site_id ...')
    const msgBefore = await pool.query(`select count(*)::int as c from public.messages where site_id is null`)
    console.log('Messages with NULL site_id (before):', msgBefore.rows[0].c)
    const msgSql = `UPDATE public.messages m
    SET site_id = c.site_id
    FROM public.conversations c
    WHERE m.conversation_id = c.id
      AND m.site_id IS NULL
      AND c.site_id IS NOT NULL`;
    const msgStart = Date.now()
    const msgRes = await pool.query(msgSql)
    console.log(`Updated message rows: ${msgRes.rowCount}`)
    console.log(`Duration: ${(Date.now() - msgStart)}ms`)
    const msgAfter = await pool.query(`select count(*)::int as c from public.messages where site_id is null`)
    console.log('Messages with NULL site_id (after):', msgAfter.rows[0].c)
    if (msgAfter.rows[0].c === msgBefore.rows[0].c) {
        console.log('ℹ️ No additional message site_ids set (possibly already aligned).')
    } else {
        console.log('✅ Message backfill completed.')
    }
}

main().catch(err => { console.error(err); process.exitCode = 1 }).finally(() => pool.end())
