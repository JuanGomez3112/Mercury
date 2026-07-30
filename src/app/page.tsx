import Link from "next/link";
import Nav from "@/components/Nav";
import MercuryMark from "@/components/MercuryMark";

const pilares = [
  { titulo: "Red social", desc: "Perfiles, feed y comunidad para mentes abiertas. El núcleo de Mercury." },
  { titulo: "Contenido de pago", desc: "Creadores 18+ monetizan su contenido. Suscripciones y compras directas." },
  { titulo: "Tienda Mercury", desc: "Artículos y merch propios del ecosistema, con envío y catálogo." },
  { titulo: "Merycoin", desc: "Criptomoneda del ecosistema para pagos, propinas y recompensas." },
];

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
          <div className="order-2 lg:order-1">
            <span className="inline-block rounded-[1.25rem] border-2 border-purple/40 px-4 py-1 text-xs font-black uppercase tracking-wider text-purple-soft">
              Comunidad 18+
            </span>
            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
              La red social para{" "}
              <span className="text-purple">mentes abiertas</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-purple-soft">
              Comunidad, contenido, tienda y economía propia — todo en un solo lugar.
              Solo para adultos.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="rounded-[1.25rem] bg-purple px-7 py-3 text-center font-black text-navy transition hover:brightness-95"
              >
                Crear cuenta
              </Link>
              <Link
                href="/login"
                className="rounded-[1.25rem] border-2 border-white/20 px-7 py-3 text-center font-black text-white transition hover:border-purple hover:text-purple"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>

          {/* Panel del logo — navy sobre gradiente lavanda (combo del diseño) */}
          <div className="order-1 flex justify-center lg:order-2">
            <div className="mercury-authbg flex aspect-square w-full max-w-md items-center justify-center rounded-[2rem] p-10 shadow-2xl">
              <MercuryMark navy className="h-[45vh] max-h-80 w-auto" />
            </div>
          </div>
        </section>

        {/* Pilares */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <h2 className="mb-6 text-center text-sm font-black uppercase tracking-widest text-white/40">
            Un ecosistema, muchas funciones
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {pilares.map((p) => (
              <div
                key={p.titulo}
                className="rounded-[1.25rem] border-2 border-white/10 bg-navy-2/50 p-6 transition hover:border-purple/40"
              >
                <h3 className="text-lg font-black text-white">{p.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-purple-soft/80">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-white/10 px-6 py-8 text-center text-xs text-white/40">
        Mercury · Comunidad 18+ · Esqueleto v0
      </footer>
    </>
  );
}
