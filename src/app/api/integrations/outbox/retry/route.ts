import { NextRequest } from 'next/server'
import { POST as tenantRetry } from '../retry-tenant/route'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
    return tenantRetry(req)
}
