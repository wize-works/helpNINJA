import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { resolveTenantIdFromRequest } from '@/lib/auth'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

type SiteRow = {
  id: string
  domain: string
  verification_token: string
  verified: boolean
}

export async function POST(req: NextRequest, ctx: Context) {
  const tenantId = await resolveTenantIdFromRequest(req, true)
  const { id } = await ctx.params

  if (!id) {
    return NextResponse.json({ error: 'Missing site ID' }, { status: 400 })
  }

  const body = await req.json() as {
    method?: 'dns' | 'meta' | 'file'
  }

  const { method = 'meta' } = body

  try {
    // Get site details
    const { rows } = await query<SiteRow>(
      'SELECT id, domain, verification_token, verified FROM public.tenant_sites WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    const site = rows[0]

    if (site.verified) {
      return NextResponse.json({ 
        verified: true, 
        message: 'Domain already verified' 
      })
    }

    // Perform verification based on method
    let verificationResult = false
    let errorMessage = ''

    try {
      switch (method) {
        case 'meta':
          verificationResult = await verifyByMetaTag(site.domain, site.verification_token)
          errorMessage = 'Meta tag verification failed. Please add the required meta tag to your homepage.'
          break
        case 'dns':
          verificationResult = await verifyByDNS(site.domain, site.verification_token)
          errorMessage = 'DNS verification failed. Please add the required TXT record to your domain.'
          break
        case 'file':
          verificationResult = await verifyByFile(site.domain, site.verification_token)
          errorMessage = 'File verification failed. Please upload the verification file to your domain root.'
          break
        default:
          return NextResponse.json({ error: 'Invalid verification method' }, { status: 400 })
      }
    } catch (error) {
      console.error('Verification error:', error)
      verificationResult = false
    }

    if (verificationResult) {
      // Mark as verified
      await query(
        'UPDATE public.tenant_sites SET verified = true, updated_at = now() WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      )

      return NextResponse.json({ 
        verified: true,
        method,
        message: 'Domain successfully verified!'
      })
    } else {
      return NextResponse.json({ 
        verified: false,
        method,
        message: errorMessage,
        verification_token: site.verification_token
      }, { status: 422 })
    }
  } catch (error) {
    console.error('Error during domain verification:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest, ctx: Context) {
  const tenantId = await resolveTenantIdFromRequest(req, true)
  const { id } = await ctx.params

  if (!id) {
    return NextResponse.json({ error: 'Missing site ID' }, { status: 400 })
  }

  try {
    const { rows } = await query<SiteRow>(
      'SELECT id, domain, verification_token, verified FROM public.tenant_sites WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    const site = rows[0]

    return NextResponse.json({
      verified: site.verified,
      verification_token: site.verification_token,
      verification_methods: {
        meta: {
          tag: `<meta name="helpninja-verification" content="${site.verification_token}" />`,
          instructions: 'Add this meta tag to the <head> section of your homepage'
        },
        dns: {
          record: `TXT helpninja-verification ${site.verification_token}`,
          instructions: 'Add this TXT record to your domain DNS settings'
        },
        file: {
          filename: 'helpninja-verification.txt',
          content: site.verification_token,
          path: `https://${site.domain}/helpninja-verification.txt`,
          instructions: 'Upload a file with this content to your domain root'
        }
      }
    })
  } catch (error) {
    console.error('Error fetching verification details:', error)
    return NextResponse.json({ error: 'Failed to fetch verification details' }, { status: 500 })
  }
}

// Helper function to verify domain ownership via meta tag
async function verifyByMetaTag(domain: string, token: string): Promise<boolean> {
  try {
    const response = await fetch(`https://${domain}`, {
      method: 'GET',
      headers: { 'User-Agent': 'HelpNinja-Verifier/1.0' },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    if (!response.ok) return false

    const html = await response.text()
    const metaRegex = new RegExp(`<meta\\s+name=['"]helpninja-verification['"]\\s+content=['"]${token}['"]\\s*\\/?>`, 'i')
    
    return metaRegex.test(html)
  } catch {
    return false
  }
}

// Helper function to verify domain ownership via DNS TXT record
async function verifyByDNS(domain: string, token: string): Promise<boolean> {
  try {
    // Note: This is a simplified implementation
    // In production, you'd use a proper DNS resolver library
    const response = await fetch(`https://dns.google/resolve?name=helpninja-verification.${domain}&type=TXT`)
    const data = await response.json()
    
    if (!data.Answer) return false
    
    return data.Answer.some((record: any) => 
      record.type === 16 && record.data.includes(token)
    )
  } catch {
    return false
  }
}

// Helper function to verify domain ownership via file upload
async function verifyByFile(domain: string, token: string): Promise<boolean> {
  try {
    const response = await fetch(`https://${domain}/helpninja-verification.txt`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    if (!response.ok) return false

    const content = await response.text()
    return content.trim() === token
  } catch {
    return false
  }
}
