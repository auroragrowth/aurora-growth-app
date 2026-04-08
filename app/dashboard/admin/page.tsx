import { requireAdmin } from "@/lib/admin/requireAdmin";
import AdminPanel from "./AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen bg-[#020b22] text-white">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-6">
        <AdminPanel adminEmail={admin.email || ""} />
      </div>
    </div>
  );
}
