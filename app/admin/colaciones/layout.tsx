import { requireAccesoModulo } from '@/lib/rbac'

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAccesoModulo('colaciones')
  return <>{children}</>
}
