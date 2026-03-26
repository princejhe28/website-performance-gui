"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export default function Filters({ total }: { total: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all" || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      // Reset to page 1 when filter changes
      if (key !== "page") params.delete("page");
      router.push(`/dashboard?${params.toString()}`);
    },
    [router, searchParams]
  );

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "all";
  const strategy = searchParams.get("strategy") ?? "all";

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "center",
        background: "#fff",
        padding: "16px 20px",
        borderRadius: 16,
        boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        marginBottom: 20,
      }}
    >
      {/* Search */}
      <input
        type="text"
        placeholder="Search by hostname..."
        defaultValue={q}
        onChange={(e) => update("q", e.target.value)}
        style={{
          padding: "8px 14px",
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          fontSize: 14,
          outline: "none",
          minWidth: 220,
          flex: 1,
        }}
      />

      {/* Status filter */}
      <select
        value={status}
        onChange={(e) => update("status", e.target.value)}
        style={selectStyle}
      >
        <option value="all">All statuses</option>
        <option value="pass">Pass only</option>
        <option value="fail">Fail only</option>
      </select>

      {/* Strategy filter */}
      <select
        value={strategy}
        onChange={(e) => update("strategy", e.target.value)}
        style={selectStyle}
      >
        <option value="all">All strategies</option>
        <option value="mobile">Mobile only</option>
        <option value="desktop">Desktop only</option>
      </select>

      <span style={{ fontSize: 13, color: "#9ca3af", marginLeft: "auto" }}>
        {total} result{total !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  fontSize: 14,
  background: "#fff",
  cursor: "pointer",
  outline: "none",
};
