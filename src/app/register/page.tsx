import AuthShell from "@/components/AuthShell";
import RegisterWizard from "@/components/RegisterWizard";

export default function RegisterPage() {
  return (
    <AuthShell titulo="Crear cuenta" alt={{ texto: "¿Ya tienes cuenta?", href: "/login", label: "Iniciar sesión" }}>
      <RegisterWizard />
    </AuthShell>
  );
}
