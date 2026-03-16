import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    (user.user_metadata?.first_name as string | undefined) ||
    user.email?.split("@")[0] ||
    "User";

  return (
    <DashboardShell
      userName={fullName}
      userEmail={user.email || ""}
      lastLogin={user.last_sign_in_at}
      planName="Aurora Free"
      brokerStatus="Not connected to Trading 212"
    >
      {children}
    </DashboardShell>
  );
}
