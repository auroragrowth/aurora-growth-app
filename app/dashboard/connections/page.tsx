import PageHero from "@/components/dashboard/PageHero";
import ConnectionsClient from "./ConnectionsClient";

export default function ConnectionsPage() {
  return (
    <div className="space-y-6">
      <PageHero
        title="Inside the Aurora platform."
        description="Connect Trading 212, choose your Aurora paper or live mode, and manage brokerage access in the same premium environment as the main site."
      />

      <ConnectionsClient />
    </div>
  );
}
