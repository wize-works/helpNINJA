import { POST as tenantRetry } from '../retry-tenant/route'

export const runtime = 'nodejs'

export async function POST() {
    return tenantRetry()
}
