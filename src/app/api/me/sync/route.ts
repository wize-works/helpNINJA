import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function gone() {
    return NextResponse.json({ error: 'route_removed' }, { status: 410 })
}

export async function GET() { return gone() }
export async function POST() { return gone() }
export async function PUT() { return gone() }
export async function PATCH() { return gone() }
export async function DELETE() { return gone() }
export async function HEAD() { return gone() }
export async function OPTIONS() { return gone() }
