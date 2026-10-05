"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function LegacyInsightsRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/media/")
  }, [router])

  return null
}
