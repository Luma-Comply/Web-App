import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function BillingLoading() {
  return (
    <div className="space-y-6">
      {/* Subscription Status Card */}
      <Card className="glass-card border border-sage-medium/30 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>

        {/* Status Badge */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-28 mt-1" />
            </div>
          </div>

          {/* Plan Details */}
          <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-sage-medium/30">
            <div className="space-y-3">
              <div>
                <Skeleton className="h-3 w-24 mb-3" />
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-4 w-36" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Skeleton className="h-3 w-16 mb-3" />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div>
                <Skeleton className="h-3 w-28 mb-3" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Cancel Subscription Section */}
      <Card className="glass-card border border-sage-medium/30 p-6">
        <div className="flex items-start justify-between">
          <div>
            <Skeleton className="h-6 w-44 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
      </Card>
    </div>
  )
}
