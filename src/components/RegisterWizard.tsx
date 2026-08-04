"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SEXUALITIES, NATIONALITIES } from "@/lib/profile-options";

const labelCls = "mb-1.5 block text-sm text-purple-soft";
const inputCls = "w-full rounded-lg border border-white/10 bg-navy px-3.5 py-2.5 text-white outline-none transition placeholder:text-white/30 focus:border-purple";

export default function RegisterWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [f, setF] = useState({
    nombre: "", apellido: "", username: "", email: "", password: "", password2: "",
    sexuality: "", nationality: "", phone: "", recoveryEmail: "", birthdate: "", tyc: false,
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  function next() {
    setError("");
    if (!f.nombre.trim() || !f.username.trim() || !f.email.trim() || !f.password) return setError("Completa los campos requeridos");
    if (f.username.trim().length < 3) return setError("Usuario: mínimo 3 caracteres");
    if (f.password.length < 8) return setError("Contraseña: mínimo 8 caracteres");
    if (f.password !== f.password2) return setError("Las contraseñas no coinciden");
    setStep(2);
  }

  async function submit() {
    setError("");
    if (!f.sexuality || !f.nationality || !f.birthdate) return setError("Completa sexualidad, nacionalidad y fecha de nacimiento");
    if (!f.tyc) return setError("Debes aceptar los términos");
    setBusy(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: f.nombre, apellido: f.apellido, username: f.username, email: f.email,
        password: f.password, password2: f.password2, birthdate: f.birthdate,
        sexuality: f.sexuality, nationality: f.nationality, phone: f.phone,
        recoveryEmail: f.recoveryEmail, tycAccepted: f.tyc,
      }),
    });
    setBusy(false);
    if (res.ok) { router.push("/feed"); router.refresh(); }
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? "Error al registrar"); setStep(1); }
  }

  return (
    <div>
      <p className="mb-4 text-center text-xs text-white/40">Paso {step} de 2</p>

      {step === 1 ? (
        <>
          <label className="mb-4 block"><span className={labelCls}>Nombre</span><input className={inputCls} placeholder="Escribe tus nombres" value={f.nombre} onChange={set("nombre")} /></label>
          <label className="mb-4 block"><span className={labelCls}>Apellido</span><input className={inputCls} placeholder="Escribe tus apellidos" value={f.apellido} onChange={set("apellido")} /></label>
          <label className="mb-4 block"><span className={labelCls}>Usuario</span><input className={inputCls} placeholder="Escribe tu usuario" value={f.username} onChange={set("username")} /></label>
          <label className="mb-4 block"><span className={labelCls}>E-mail</span><input className={inputCls} type="email" placeholder="Escribe tu email" value={f.email} onChange={set("email")} /></label>
          <label className="mb-4 block"><span className={labelCls}>Contraseña</span><input className={inputCls} type="password" placeholder="Mínimo 8 caracteres" value={f.password} onChange={set("password")} /></label>
          <label className="mb-4 block"><span className={labelCls}>Confirma contraseña</span><input className={inputCls} type="password" placeholder="Repite la contraseña" value={f.password2} onChange={set("password2")} /></label>
        </>
      ) : (
        <>
          <label className="mb-4 block"><span className={labelCls}>Sexualidad</span>
            <select className={inputCls} value={f.sexuality} onChange={set("sexuality")}>
              <option value="">Elige tu sexualidad</option>
              {SEXUALITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="mb-4 block"><span className={labelCls}>Nacionalidad</span>
            <select className={inputCls} value={f.nationality} onChange={set("nationality")}>
              <option value="">Elige tu nacionalidad</option>
              {NATIONALITIES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="mb-4 block"><span className={labelCls}>Número de teléfono</span><input className={inputCls} placeholder="+1 ***" value={f.phone} onChange={set("phone")} /></label>
          <label className="mb-4 block"><span className={labelCls}>E-mail de recuperación</span><input className={inputCls} type="email" placeholder="Escribe tu email" value={f.recoveryEmail} onChange={set("recoveryEmail")} /></label>
          <label className="mb-4 block"><span className={labelCls}>Fecha de nacimiento</span><input className={inputCls} type="date" value={f.birthdate} onChange={set("birthdate")} /></label>
          <label className="mb-4 flex items-start gap-2 text-xs text-white/60">
            <input type="checkbox" checked={f.tyc} onChange={set("tyc")} className="mt-0.5 accent-purple" />
            <span>Al aceptar, aceptas las Políticas de datos, cookies y los Términos de confidencialidad. Podemos enviarte notificaciones por SMS que puedes desactivar cuando quieras.</span>
          </label>
        </>
      )}

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="flex gap-3">
        {step === 2 && (
          <button onClick={() => setStep(1)} className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-medium text-white/70 transition hover:text-white">Atrás</button>
        )}
        {step === 1 ? (
          <button onClick={next} className="flex-1 rounded-lg bg-purple py-2.5 font-medium text-navy transition hover:opacity-90">Siguiente</button>
        ) : (
          <button onClick={submit} disabled={busy} className="flex-1 rounded-lg bg-purple py-2.5 font-medium text-navy transition hover:opacity-90 disabled:opacity-60">{busy ? "Creando…" : "Registrarte"}</button>
        )}
      </div>
    </div>
  );
}
