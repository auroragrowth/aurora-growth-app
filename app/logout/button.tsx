"use client";

import { useFormStatus } from "react-dom";
import { signOut } from "./actions";

function InnerButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:bg-white/10 disabled:opacity-60"
    >
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}

export default function LogoutButton() {
  return (
    <form action={signOut}>
      <InnerButton />
    </form>
  );
}
