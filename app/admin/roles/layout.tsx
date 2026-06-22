import { requireAdminPage } from '@/lib/rbac'

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAdminPage()
  return <>{children}</>
}
