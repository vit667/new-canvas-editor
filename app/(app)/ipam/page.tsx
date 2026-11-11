import { Suspense } from "react"
import { IpamPage } from "@/components/ipam/ipam-page"

export const metadata = { title: "IPAM · Canvas Editor" }

export default function Page() {
  return (
    <Suspense>
      <IpamPage />
    </Suspense>
  )
}
