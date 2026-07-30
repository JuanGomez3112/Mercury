"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell, { Field } from "@/components/AuthShell";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: fd.get("nombre"),
        apellido: fd.get("apellido"),
        username: fd.get("username"),
        password: fd.get("password"),
        password2: fd.get("password2"),
        birthdate: fd.get("birthdate"),
      }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/feed");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al registrar");
    }
  }

  return (
    <AuthShell
      titulo="Crear cuenta"
      alt={{ texto: "¿Ya tienes cuenta?", href: "/login", label: "Iniciar sesión" }}
    >
      <form onSubmit={onSubmit}>
        <Field label="Nombre" name="nombre" autoComplete="given-name" />
        <Field label="Apellido" name="apellido" autoComplete="family-name" />
        <Field label="Usuario" name="username" autoComplete="username" />
        <Field label="Fecha de nacimiento" name="birthdate" type="date" />
        <Field label="Contraseña" name="password" type="password" autoComplete="new-password" />
        <Field label="Confirma contraseña" name="password2" type="password" autoComplete="new-password" />
        <label className="mb-4 flex items-start gap-2 text-xs text-white/60">
          <input type="checkbox" required className="mt-0.5 accent-purple" />
          Confirmo que soy mayor de 18 años y acepto los términos.
        </label>
        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
        <button
          disabled={loading}
          className="w-full rounded-lg bg-purple py-2.5 font-medium text-navy transition hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Creando…" : "Continuar"}
        </button>
      </form>
    </AuthShell>
  );
}
