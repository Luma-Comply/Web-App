import { Skeleton } from "@/components/ui/skeleton"

export default function AuditLoading() {
  return (
    <div className="min-h-screen bg-light-gray">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96 mb-8" />
        <Skeleton className="h-12 w-full mb-6" />
        <Skeleton className="h-64 w-full mb-6" />
        <Skeleton className="h-32 w-full mb-6" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  )
}
