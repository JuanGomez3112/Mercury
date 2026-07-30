"use client";

import AuthShell, { Field } from "@/components/AuthShell";

export default function RegisterPage() {
  return (
    <AuthShell
      titulo="Crear cuenta"
      alt={{ texto: "¿Ya tienes cuenta?", href: "/login", label: "Iniciar sesión" }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          // TODO: backend registro
          alert("Registro pendiente de backend");
        }}
      >
        <Field label="Nombre" name="nombre" autoComplete="given-name" />
        <Field label="Apellido" name="apellido" autoComplete="family-name" />
        <Field label="Usuario" name="user" autoComplete="username" />
        <Field label="Contraseña" name="password" type="password" autoComplete="new-password" />
        <Field label="Confirma contraseña" name="password2" type="password" autoComplete="new-password" />
        <label className="mb-5 flex items-start gap-2 text-xs text-white/60">
          <input type="checkbox" name="adult" required className="mt-0.5 accent-purple" />
          Confirmo que soy mayor de 18 años y acepto los términos.
        </label>
        <button className="w-full rounded-lg bg-purple py-2.5 font-medium text-navy transition hover:opacity-90">
          Continuar
        </button>
      </form>
    </AuthShell>
  );
}
