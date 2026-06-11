import { NextRequest } from 'next/server'
import { runDueSubscriptions } from '@/lib/email/digest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return new Response('CRON_SECRET no configurado', { status: 500 })
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('No autorizado', { status: 401 })
  }

  const result = await runDueSubscriptions()
  return Response.json(result)
}
