import { createClient } from "@/lib/supabase/server";
import Trading212ConnectionCard from "@/components/account/Trading212ConnectionCard";

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let connection: any = null;

  if (user) {
    const { data } = await supabase
      .from("user_broker_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("broker", "trading212")
      .maybeSingle();

    connection = data;
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/70">
          Aurora Account
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          Account Settings
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
          Manage your Aurora profile, access, and connected broker accounts.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
        <section className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.02))] p-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
            Profile
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                Email
              </div>
              <div className="mt-2 text-sm font-medium text-white">
                {user?.email || "Not signed in"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                User ID
              </div>
              <div className="mt-2 break-all text-sm font-medium text-white/75">
                {user?.id || "—"}
              </div>
            </div>
          </div>
        </section>

        <Trading212ConnectionCard connection={connection} />
      </div>
    </div>
  );
}
