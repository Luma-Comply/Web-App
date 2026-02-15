import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { LumaLogo } from "@/components/LumaLogo"

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-light-gray">
      {/* Header */}
      <header className="border-b border-sage-medium/50 glass-card sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LumaLogo className="w-8 h-8" />
            <span className="text-xl font-serif font-bold text-dark-bg">Luma</span>
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6 glass-card border border-sage-medium/30">
              <Skeleton className="h-3 w-24 mb-3" />
              <Skeleton className="h-7 w-16" />
            </Card>
          ))}
        </div>

        {/* Case Management Section */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />

          {/* Tabs and Search */}
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-64" />
          </div>

          {/* Table */}
          <Card className="glass-card border border-sage-medium/30 overflow-hidden">
            {/* Table Header */}
            <div className="bg-sage-medium/10 p-4 border-b border-sage-medium/20">
              <div className="flex gap-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-sage-medium/20">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <Skeleton className="h-5 w-36 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
