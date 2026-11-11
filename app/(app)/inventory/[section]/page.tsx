import { Suspense } from "react"
import { notFound } from "next/navigation"
import { sectionBySlug } from "@/lib/navigation"
import { InventoryPage } from "@/components/inventory/inventory-page"

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  if (!sectionBySlug(section)) notFound()
  return (
    <Suspense>
      <InventoryPage slug={section} />
    </Suspense>
  )
}
