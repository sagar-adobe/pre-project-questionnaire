import { Suspense } from 'react'
import AppRouter from '@/components/AppRouter'

// Suspense is required so useSearchParams (inside AppRouter) works with output: export.
// The pre-rendered HTML shows the fallback; client hydration renders the real content.
export default function Home() {
  return (
    <Suspense>
      <AppRouter />
    </Suspense>
  )
}
