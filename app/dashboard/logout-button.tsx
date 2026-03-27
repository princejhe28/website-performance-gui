"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        background: "transparent",
        border: "1px solid var(--border-strong)",
        borderRadius: 8,
        padding: "7px 14px",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 600,
        color: "var(--text-secondary)",
      }}
    >
      Sign out
    </button>
  );
}
