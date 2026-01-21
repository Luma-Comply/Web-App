import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function TeamLoading() {
  return (
    <div className="space-y-6">
      {/* Team Overview Card */}
      <Card className="glass-card border border-sage-medium/30 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Skeleton className="h-6 w-36 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>

        {/* Seats Info */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-sage-light/20 rounded-lg">
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="text-right">
            <Skeleton className="h-8 w-8 ml-auto mb-1" />
            <Skeleton className="h-3 w-16 ml-auto" />
          </div>
        </div>

        {/* Team Members Table */}
        <div className="border border-sage-medium/30 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-sage-medium/10 p-4 border-b border-sage-medium/20">
            <div className="flex gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-sage-medium/20">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Pending Invitations Card */}
      <Card className="glass-card border border-sage-medium/30 p-6">
        <Skeleton className="h-6 w-44 mb-4" />
        <div className="border border-sage-medium/30 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-sage-medium/10 p-4 border-b border-sage-medium/20">
            <div className="flex gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-sage-medium/20">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
