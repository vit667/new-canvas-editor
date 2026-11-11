import { SchemePage } from "@/components/schemes/scheme-page"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SchemePage id={decodeURIComponent(id)} />
}
