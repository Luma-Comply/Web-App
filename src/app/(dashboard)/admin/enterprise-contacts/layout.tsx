import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function EnterpriseContactsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/")

  const { data: userData } = await supabase
    .from("users")
    .select("is_super_admin")
    .eq("id", user.id)
    .single()

  if (!userData?.is_super_admin) {
    redirect("/dashboard")
  }

  return <>{children}</>
}
