"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";

type AuthMode = "login" | "register";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("register");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const values = new FormData(event.currentTarget);
    const payload = {
      email: values.get("email"),
      password: values.get("password"),
      ...(mode === "register" ? {
        display_name: values.get("display_name"),
        role: values.get("role"),
      } : {}),
    };
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = typeof result === "object" && result !== null
          ? (result as Record<string, unknown>).detail
          : null;
        setError(typeof detail === "string" ? detail : "We couldn’t sign you in. Please try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("Account service is unavailable right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-tabs" role="tablist" aria-label="Account action">
        <button type="button" role="tab" aria-selected={mode === "register"} onClick={() => { setMode("register"); setError(""); }}><UserPlus size={14} /> Create account</button>
        <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => { setMode("login"); setError(""); }}><LogIn size={14} /> Sign in</button>
      </div>
      <form className="auth-form" onSubmit={submit}>
        {mode === "register" && <>
          <label htmlFor="display_name">Your name</label>
          <input id="display_name" name="display_name" autoComplete="name" minLength={2} maxLength={80} required />
          <label htmlFor="role">I’m joining as</label>
          <select id="role" name="role" defaultValue="traveler"><option value="traveler">A traveler</option><option value="guide">A local guide</option></select>
        </>}
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" maxLength={254} required />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={mode === "register" ? 12 : 1} maxLength={128} required />
        {mode === "register" && <p className="auth-hint">Use at least 12 characters. You can update your details later.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-dark auth-submit" disabled={busy} type="submit">{busy ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}<ArrowRight size={15} /></button>
      </form>
    </div>
  );
}
