# Mercury

Red social para adultos 18+ de mente abierta. Ecosistema: red social + venta de contenido de pago + tienda de artículos + criptomoneda **Merycoin**.

> Esqueleto v0 — Next.js (App Router, TS, Tailwind v4). Sin backend todavía.

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS v4
- Build `output: standalone` (deploy en Proxmox CT 106)

## Estructura

- `src/app/` — rutas: `/` (landing), `/login`, `/register`
- `src/components/` — `Nav`, `MercuryMark` (logo por mask), `AgeGate` (18+), `AuthShell`
- `public/mercury-logo.svg` — logo
- `legacy-static/` — sitio estático v0 original (referencia)

## Desarrollo

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
```

## Deploy (CT 106)

Push a `master` → `ssh proxmox "pct exec 106 -- /usr/local/bin/mercury-deploy"`.
Sirve en http://192.168.1.106 (nginx proxy -> Next standalone :3000).

## Pendiente

- Stack real de backend (auth, DB, pagos, wallet Merycoin)
- Cumplimiento: verificación de edad real, procesador de pagos apto para contenido adulto, moderación
- Canonizar paleta (navy+morado vs rojo heredado)
