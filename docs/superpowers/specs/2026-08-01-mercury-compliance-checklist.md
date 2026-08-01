# Mercury — Checklist de Cumplimiento y Mapa de Riesgos

- **Fecha:** 2026-08-01
- **Tipo:** Mapa educativo de reglas y riesgos. **NO es asesoría legal.** No sustituye a un abogado y no constituye una autorización para lanzar con dinero real o contenido adulto. Cada regla depende de tu jurisdicción, tipo de contenido y estructura del negocio — eso lo confirma un abogado licenciado en tu país/estado.
- **Uso:** priorizar trabajo técnico y saber qué preguntas llevar al abogado. Complementa el spec de diseño `2026-08-01-mercury-cumplimiento-design.md`.

---

## 0. La línea absoluta — menores (CSAM)

**Tolerancia cero. No es una decisión de negocio, es derecho penal en prácticamente toda jurisdicción.**

- Contenido sexual de menores = delito grave. Ninguna verificación de edad "suave" te protege si el contenido llega a la plataforma.
- Obligaciones típicas donde aplica ley US (y análogas en otros países):
  - **Detección + retiro inmediato** de CSAM.
  - **Reporte obligatorio** a la autoridad correspondiente (en US: NCMEC CyberTipline). No reportar es delito aparte.
  - **Preservar evidencia** según lo exija la ley al reportar (no destruir).
- Implicación de diseño: el motivo de reporte `menor_edad` (ya es **prioridad roja** en moderación) debe escalar a acción humana inmediata +, si se confirma, ruta de reporte a la autoridad. Hoy Mercury tiene la cola de prioridad; **falta el procedimiento de escalado/reporte legal** (proceso, no solo código).
- **Estado Mercury:** cola de moderación con prioridad roja ✅ · procedimiento formal de reporte a autoridad ❌ (definir con abogado).

---

## 1. Verificación de edad de usuarios (acceso)

Dos niveles distintos:

| Nivel | Qué es | Estado Mercury |
|---|---|---|
| **Suave / auto-declarada** | Fecha de nacimiento + age-gate. Disuade, no prueba. | ✅ tiene (18+ server-side por fecha) |
| **Fuerte / verificada** | Documento de identidad o estimación certificada por proveedor. | ❌ no tiene |

- Tendencia regulatoria (creciente, verifícalo por jurisdicción): varias jurisdicciones (varios estados de EE. UU., Reino Unido bajo la Online Safety Act, y otros) **exigen verificación de edad fuerte** para acceder a contenido adulto. La auto-declaración puede no bastar donde apliquen esas leyes.
- Depende de **dónde estén tus usuarios**, no solo de dónde estés tú.
- **Pregunta al abogado:** ¿en qué jurisdicciones vas a operar/aceptar usuarios, y cuáles exigen verificación fuerte?

## 2. Registros de performers / contenido (§2257 en US)

- Aplica a quien **produce** contenido sexualmente explícito (US 18 U.S.C. §2257): obliga a llevar registros que prueben que **cada persona representada era mayor de 18** (copia de ID, fechas, custodio de registros).
- Punto clave para una plataforma con **contenido generado por usuarios (UGC)**: ¿eres "productor secundario"? ¿Trasladas la obligación al creador vía T&C, y verificas? Esto es **exactamente** lo que decide un abogado según cómo estructures creadores.
- **Estado Mercury:** contenido de pago de creadores existe (PPV/sub) pero **sin verificación de identidad de creador ni registros 2257** ❌.

## 3. Moderación, notice & takedown, contenido no consentido

- **NCII / "revenge porn" / deepfakes no consentidos:** ilegales en muchas jurisdicciones; requieren ruta de retiro rápida. Motivo `no_consentido` ya es prioridad roja ✅.
- **Notice & takedown de copyright (DMCA en US):** si alojas UGC, normalmente necesitas un **agente DMCA registrado** + proceso de retiro para beneficiarte del "safe harbor". ❌ no configurado.
- **Estado Mercury:** sistema de reportes + cola admin + baneo/suspensión ✅ · agente DMCA ❌ · procedimiento NCII formal ❌.

## 4. Dinero — AML / KYC / transmisión de dinero / sanciones

Aquí es donde el on-ramp (BTCPay) cruza a territorio regulado:

- **KYC/AML:** al mover dinero real (compra de ☾, y sobre todo **retiros/payouts a creadores**), suelen aplicar obligaciones de identificación de cliente, monitoreo y reporte de actividad sospechosa. El umbral y la forma dependen de jurisdicción y de si eres tú quien custodia/transmite.
- **Transmisión de dinero / MSB:** convertir fiat↔crédito↔cripto y pagar a terceros puede clasificarte como transmisor de dinero (licencias estatales en US, registro FinCEN, equivalentes en otros países). **Cripto no te exime** de esto.
- **Custodia:** el modelo **no custodial** (BTCPay directo a tu wallet, el creador retira a SU exchange donde él hace su KYC) reduce — no elimina — tu exposición frente a un modelo donde tú custodias saldos de terceros.
- **Sanciones (OFAC en US y listas equivalentes):** no puedes pagar/operar con personas o países sancionados. Screening puede ser exigible.
- **Chargebacks/reversos:** con cripto on-chain confirmado el reverso es raro (ventaja), pero define política de reembolso y clawback de ☾ (el spec de on-ramp ya lo contempla).
- **Estado Mercury:** on-ramp cripto técnico ✅ (BTCPay, no custodial) · KYC/AML en retiros ❌ · screening sanciones ❌ · `launched=false` mantiene retiros apagados (mitigación actual correcta).

## 5. Privacidad de datos

- **GDPR (UE/EEE), CCPA/CPRA (California), y equivalentes:** derechos de acceso/borrado, base legal, aviso de privacidad, minimización. Datos de orientación/sexualidad + biométricos (si haces verificación facial) son **categorías sensibles** con reglas más estrictas.
- Nunca poner datos personales en URLs/logs; cifrar en reposo lo sensible; retención mínima de documentos de verificación.
- **Estado Mercury:** aviso de privacidad formal ❌ · flujos de borrado/acceso ❌ · (buenas prácticas técnicas parciales ya presentes).

## 6. Términos, consentimiento y registros

- **T&C + Política de privacidad + Política de contenido** versionadas y aceptadas con registro (quién/cuándo/qué versión).
- **Consentimiento de performers** documentado (liga con §2257).
- **Edad + país** registrados en el consentimiento.
- **Estado Mercury:** T&C versionados ❌ (el spec de cumplimiento los diseña).

---

## Ranking de riesgo (para priorizar)

| # | Riesgo | Gravedad | Estado |
|---|---|---|---|
| 1 | Menores/CSAM — escalado + reporte a autoridad | **Crítico (penal)** | Cola prioridad ✅ · procedimiento ❌ |
| 2 | KYC/AML + licencia de transmisión de dinero en retiros | Alto (regulatorio/financiero) | Bloqueado por `launched=false` ✅ mitigación |
| 3 | Verificación de edad fuerte según jurisdicción de usuarios | Alto | ❌ |
| 4 | §2257 / verificación de identidad de creadores | Alto (si UGC explícito) | ❌ |
| 5 | NCII + agente DMCA + notice/takedown | Medio-Alto | Reportes ✅ · procesos formales ❌ |
| 6 | Privacidad (GDPR/CCPA) + datos sensibles | Medio | ❌ |
| 7 | T&C/consentimiento versionados | Medio | ❌ |

## Qué NO desbloquea este documento

- No confirma que puedas lanzar con dinero real ni con contenido adulto en ninguna jurisdicción.
- No define umbrales de KYC ni si eres transmisor de dinero — eso es determinación legal específica.
- La infraestructura técnica (on-ramp gratis vía BTCPay) puede estar lista y aun así **faltar** la capa legal de arriba antes de `launched=true`.

## Preguntas para el abogado (lleva estas)

1. Jurisdicciones de operación y de usuarios → ¿qué verificación de edad exige cada una?
2. ¿Soy transmisor de dinero / MSB con el modelo de ☾ + on-ramp cripto + payouts? ¿Qué licencias/registros?
3. Con UGC explícito de creadores, ¿cómo aplico §2257 y quién es custodio de registros?
4. Modelo no custodial (BTCPay directo) vs custodial: ¿reduce mi carga KYC/AML? ¿Cuánto?
5. Procedimiento obligatorio de reporte de CSAM en mi jurisdicción.
6. ¿Necesito agente DMCA registrado y política formal?
