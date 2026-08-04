import Link from "next/link";
import MercuryMark from "@/components/MercuryMark";
import RegisterWizard from "@/components/RegisterWizard";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen">
      {/* Izquierda: glifo Mercury sobre navy (oculto en móvil) */}
      <div className="hidden flex-1 items-center justify-center bg-navy lg:flex">
        <Link href="/" className="text-white">
          <MercuryMark className="h-72 w-44" />
        </Link>
      </div>

      {/* Derecha: panel morado con el wizard */}
      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-purple-soft via-purple to-purple p-6">
        <div className="w-full max-w-xl">
          <div className="mb-6 flex justify-center text-navy">
            <MercuryMark className="h-16 w-10" />
          </div>
          <RegisterWizard />
          <p className="mt-8 text-center text-xs font-semibold text-navy/70">
            Todos los derechos son reservados por <span className="text-navy">Mercury</span>
          </p>
        </div>
      </div>
    </main>
  );
}
