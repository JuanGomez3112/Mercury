"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell, { Field } from "@/components/AuthShell";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: fd.get("username"),
        password: fd.get("password"),
      }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/feed");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al iniciar sesión");
    }
  }

  return (
    <AuthShell
      titulo="Iniciar sesión"
      alt={{ texto: "¿No tienes cuenta?", href: "/register", label: "Registrarte" }}
    >
      <form onSubmit={onSubmit}>
        <Field label="Usuario" name="username" autoComplete="username" />
        <Field label="Contraseña" name="password" type="password" autoComplete="current-password" />
        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
        <button
          disabled={loading}
          className="w-full rounded-lg bg-purple py-2.5 font-medium text-navy transition hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Entrando…" : "Iniciar"}
        </button>
      </form>
    </AuthShell>
  );
}
