"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, type ReactNode } from "react"

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // ข้อมูลถือว่า stale หลังจาก 5 นาที
            staleTime: 5 * 60 * 1000,
            // เก็บ cache ไว้ 30 นาที
            gcTime: 30 * 60 * 1000,
            // ไม่ต้อง refetch ทุกครั้งที่กลับมาที่ window
            refetchOnWindowFocus: false,
            // Retry 1 ครั้ง
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}


