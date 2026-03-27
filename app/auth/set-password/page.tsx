"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-page)",
        padding: "0 20px",
      }}
    >
      <div
        style={{
          background: "var(--bg-card)",
          borderRadius: 20,
          padding: "40px 36px",
          boxShadow: "var(--shadow)",
          width: "100%",
          maxWidth: 400,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔑</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>
            Set your password
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
            Choose a password to secure your account
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
              New password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Min. 8 characters"
              style={inputStyle}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
              Confirm password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="Repeat your password"
              style={inputStyle}
            />
          </div>

          {/* Password strength indicator */}
          {password.length > 0 && (
            <div>
              <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 2,
                      background: strengthLevel(password) >= level
                        ? strengthColor(strengthLevel(password))
                        : "var(--border-strong)",
                      transition: "background 0.2s",
                    }}
                  />
                ))}
              </div>
              <div style={{ fontSize: 12, color: strengthColor(strengthLevel(password)) }}>
                {strengthLabel(strengthLevel(password))}
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                background: "#fee2e2",
                color: "#dc2626",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? "#a5b4fc" : "#6366f1",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "12px",
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: 4,
              transition: "background 0.15s",
            }}
          >
            {loading ? "Saving…" : "Set password & continue"}
          </button>
        </form>
      </div>
    </main>
  );
}

function strengthLevel(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

function strengthColor(level: number): string {
  if (level <= 1) return "#ef4444";
  if (level === 2) return "#f59e0b";
  if (level === 3) return "#84cc16";
  return "#22c55e";
}

function strengthLabel(level: number): string {
  if (level <= 1) return "Weak";
  if (level === 2) return "Fair";
  if (level === 3) return "Good";
  return "Strong";
}

const inputStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid var(--border-strong)",
  fontSize: 14,
  outline: "none",
  background: "var(--bg-card)",
  color: "var(--text-primary)",
  width: "100%",
  boxSizing: "border-box",
};
