// Opciones de preferencias del registro (paso 2). Compartidas cliente/server para el select + validación.

export const SEXUALITIES = [
  "Heterosexual",
  "Homosexual",
  "Bisexual",
  "Pansexual",
  "Asexual",
  "Queer",
  "Prefiero no decir",
  "Otro",
] as const;
export type Sexuality = (typeof SEXUALITIES)[number];

// Lista de nacionalidades (ampliable). El registro las expone como select; el server valida pertenencia.
export const NATIONALITIES = [
  "Argentina", "Bolivia", "Chile", "Colombia", "Costa Rica", "Cuba", "Ecuador",
  "El Salvador", "España", "Estados Unidos", "Guatemala", "Honduras", "México",
  "Nicaragua", "Panamá", "Paraguay", "Perú", "Puerto Rico", "República Dominicana",
  "Uruguay", "Venezuela",
  "Brasil", "Canadá", "Portugal", "Francia", "Italia", "Alemania", "Reino Unido",
  "Países Bajos", "Bélgica", "Suiza", "Japón", "Corea del Sur", "China", "India",
  "Australia", "Nueva Zelanda", "Sudáfrica", "Marruecos", "Otro",
] as const;
export type Nationality = (typeof NATIONALITIES)[number];
