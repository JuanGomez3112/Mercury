"use client";

import AuthShell, { Field } from "@/components/AuthShell";

export default function LoginPage() {
  return (
    <AuthShell
      titulo="Iniciar sesión"
      alt={{ texto: "¿No tienes cuenta?", href: "/register", label: "Registrarte" }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          // TODO: backend auth
          alert("Auth pendiente de backend");
        }}
      >
        <Field label="Usuario o correo" name="user" autoComplete="username" />
        <Field label="Contraseña" name="password" type="password" autoComplete="current-password" />
        <label className="mb-5 flex items-center gap-2 text-sm text-white/60">
          <input type="checkbox" name="remember" className="accent-purple" />
          Recuérdame
        </label>
        <button className="w-full rounded-lg bg-purple py-2.5 font-medium text-navy transition hover:opacity-90">
          Iniciar
        </button>
      </form>
    </AuthShell>
  );
}
