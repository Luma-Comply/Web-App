import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { LumaLogo } from "@/components/LumaLogo"

export default function NewCaseLoading() {
  return (
    <div className="min-h-screen bg-light-gray">
      {/* Header */}
      <header className="border-b border-sage-medium/50 glass-card sticky top-0 z-40">
        <div className="mx-auto px-4 max-w-3xl h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LumaLogo className="w-8 h-8" />
            <span className="text-xl font-serif font-bold text-dark-bg">Luma</span>
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Back link */}
        <Skeleton className="h-4 w-32 mb-6" />

        {/* Page Title */}
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-5 w-96 mb-8" />

        {/* Step 1: Document Type */}
        <Card className="glass-card border border-sage-medium/30 p-6 mb-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="flex gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 flex-1 rounded-lg" />
            ))}
          </div>
        </Card>

        {/* Step 2: Patient & Claim Info */}
        <Card className="glass-card border border-sage-medium/30 p-6 mb-6">
          <Skeleton className="h-6 w-56 mb-6" />
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>

        {/* Step 3: Clinical Notes */}
        <Card className="glass-card border border-sage-medium/30 p-6 mb-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-4 w-full max-w-lg mb-4" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </Card>

        {/* Step 4: Compliance Agreement */}
        <Card className="glass-card border border-sage-medium/30 p-6 mb-6">
          <Skeleton className="h-6 w-52 mb-4" />
          <div className="p-4 rounded-lg border border-sage-medium/30 mb-4">
            <Skeleton className="h-5 w-64 mb-3" />
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-48" />
              ))}
            </div>
          </div>
          <Skeleton className="h-16 w-full rounded-lg" />
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </div>
  )
}
