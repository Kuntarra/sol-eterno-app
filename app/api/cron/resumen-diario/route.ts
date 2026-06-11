import { NextRequest } from 'next/server'
import { sendDigest } from '@/lib/email/digest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Solo Vercel Cron (o quien tenga el secreto) puede gatillar el envío.
  const secret = process.env.CRON_SECRET
  if (!secret) return new Response('CRON_SECRET no configurado', { status: 500 })
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('No autorizado', { status: 401 })
  }

  const result = await sendDigest()
  return Response.json(result, { status: result.ok ? 200 : 500 })
}
