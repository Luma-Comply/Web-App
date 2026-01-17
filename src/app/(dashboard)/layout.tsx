import { FeedbackWidget } from "@/components/FeedbackWidget"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <FeedbackWidget />
    </>
  )
}
