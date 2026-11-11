import type { ReactNode } from "react"
import { cookies } from "next/headers"
import { AppShell } from "@/components/app-shell/app-shell"

export default async function AppLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const state = cookieStore.get("sidebar_state")?.value
  return <AppShell defaultOpen={state === undefined || state === "true"}>{children}</AppShell>
}
