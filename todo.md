# TODO — Mejoras OriNet Portal

Estados: `pendiente` · `en-proceso` · `hecho`

---

## A — Seguridad

### A1 — Sacar `.env` del control de versiones (SE REALIZA)
- Estado: hecho
- Motivo: `.env` quedó trackeado en git pese a estar en `.gitignore`; hoy está vacío, pero cualquier valor futuro quedaría expuesto en el historial.
- Pasos:
  1. Verificar: `git ls-files` lista `.env`.
  2. `git rm --cached .env` (sigue en disco, deja de versionarse).
  3. Revisar `git log -- .env` para confirmar que nunca tuvo credenciales reales.
  4. Si en algún commit hubo valores: rotar ISP_API_KEY, ISP_API_USER, ISP_API_PASS y REDIS_URL en Netlify.
  5. Confirmar que `.env.example` está completo y actualizado.
- Criterio: `git ls-files` ya no muestra `.env`.

### A2 — Autenticación con OTP por WhatsApp/email (DESCARTADA — NO REALIZAR)
- Estado: descartada definitivamente.
- Decisión: **no es una mejora recomendada para este proyecto.** No es necesaria en la lógica de negocio actual (portal informativo de consulta por DNI, sin transacciones sensibles).
- Regla: **no volver a proponer esta mejora.**

### A3 — Mitigaciones de enumeración/enmascaramiento (DESCARTADA — NO REALIZAR)
- Estado: descartada definitivamente.
- Decisión: igual que A2 — **no son mejoras recomendadas para este proyecto.** El acceso por DNI es una decisión de negocio vigente.
- Regla: **no volver a proponer esta mejora.**

### A4 — CORS estricto y errores sin fugas (SE REALIZA)
- Estado: hecho
- Pasos:
  1. `server/config/env.js`: si `CORS_ORIGIN` no está definido, el server no arranca (error claro). Nunca default `*`.
  2. Validar header `Origin` en el PUT `customers/:dni/email`.
  3. `server/controllers/customerController.js`: quitar `detail: error.message` del 502; loggear interno y responder genérico.
  4. Mismo tratamiento en `netlify/functions/api.js`.
  5. Actualizar `.env.example` y README.
- Criterio: sin `CORS_ORIGIN` no arranca; los 502 no exponen URLs internas.

---

## B — Calidad y arquitectura

### B1 — Tests (SE REALIZA)
- Estado: hecho
- Análisis previo:
  1. Evaluar Vitest (compat con Vite 8 beta y ESM del server).
  2. Alcance unit: `customerSummaryService` (sanitizeDni, isValidDni, isValidEmail, formatMoney, sanitizeCustomer, HIT/MISS de cache, invalidación al actualizar email) e `ispRepository` (token cacheado, retry 401, timeout, parseJsonText, redactUrl), con mocks de fetch/cache.
  3. Tests de endpoints con supertest sobre Express.
- Fase 2: implementación
  1. `npm i -D vitest supertest`.
  2. Tests en `server/**/*.test.js` (+ handler de la Function si aplica).
  3. Script `"test": "vitest run"` en package.json.
- Criterio: `npm test` en verde; CI lo corre (B4).

### B2 — Unificar capa HTTP Express ↔ Netlify Function (SE REALIZA)
- Estado: hecho
- Opción elegida: **Opción A — handler de la Netlify Function como canónico y Express como adaptador.**
  - El handler de `netlify/functions/api.js` ya es runtime-agnóstico (CORS, rate-limit, parsing, validación, errores). Express queda como adaptador de ~40 líneas (req → event, response → res).
  - Ventajas: cero dependencias nuevas, sin riesgo de compat con Express 5, y el dev local ejecuta exactamente el mismo código que producción (elimina drift y diferencias de runtime).
- Pasos:
  1. Extraer de `netlify/functions/api.js` el core `handleRequest(event)` (ya casi está).
  2. `server/index.js`: crear adapter Express que construya el event desde req y aplique la respuesta del handler.
  3. Eliminar de Express: `cors()`, rate-limit propio, `express.json` (si aplica), headers duplicados.
  4. Mantener `/health` en Express.
- Criterio: un solo lugar define CORS, rate-limit, validación y errores; los tests de endpoints pasan en ambos runtimes.

### B3 — Reglas de negocio configurables desde backend (SE REALIZA)
- Estado: hecho
- Pasos:
  1. Backend: nuevas env vars y campos en `/customer-summary`:
     - `recargoReconexion` (env `RECARGO_RECONEXION`, default 2000)
     - `recargoSegundoVencimiento` (env `RECARGO_SEGUNDO_VENCIMIENTO`, default 2000)
     - `cutDay` (env `CUT_DAY`, default 26)
  2. Frontend (`ProfileScreen.jsx`):
     - Consumir esos valores del payload; eliminar `RECARGO_RECONEXION` y `CUT_DAY` de `portalConfig.js`.
     - **Fecha de corte**: NO mostrar el bloque "Próxima fecha de corte" si el saldo es $0 (el estado del servicio se mantiene).
     - **Recargo 2do vencimiento**: se SUMA al total a pagar (desglose igual al de reconexión) y solo se muestra si la consulta ocurre entre los días 11 y 25 del mes y hay saldo pendiente. Leyenda: "Recargo de 2do vencimiento + $2000".
  3. Actualizar `.env.example` y README.
- Criterio: cambiar recargos o día de corte = editar env en Netlify, sin redeploy del frontend.

### B4 — CI con GitHub Actions (SE REALIZA)
- Estado: hecho
- Pasos:
  1. Crear `.github/workflows/ci.yml`.
  2. Jobs: checkout → setup-node 20 → `npm ci` → `npm run lint` → `npm test` → `npm run build`.
  3. Correr en PR y push a main.
- Criterio: PR con lint/tests/build rotos no se mergea.

### B5 — Limpieza de código (SE REALIZA)
- Estado: hecho
- Pasos:
  1. `index.html`: eliminar meta viewport duplicado (línea 7).
  2. `ProfileScreen.jsx`: eliminar `invoiceLoading` (línea 20) y su rama muerta "Buscando factura...".
  3. Mover `<link>` de Google Fonts a `index.html` (hoy duplicado en Login y Profile).
  4. Eliminar `src/assets/react.svg` si no se usa.
- Criterio: sin código muerto; lint en verde.

### B7 — Manejo de errores de red en `updateCustomerEmail` (SE REALIZA)
- Estado: hecho
- Pasos:
  1. `src/lib/api/portalApi.js`: try/catch en el fetch del PUT (como el GET) → `PortalApiError` con mensaje amigable.
  2. `EmailCard.jsx`: distinguir error de red vs. validación.
- Criterio: sin conexión, mensaje claro y estado consistente.

### B8 — Actualizar documentación (SE REALIZA)
- Estado: hecho
- Pasos:
  1. README: corregir "Estructura del proyecto", documentar nueva configuración (B3).
  2. `ia/decision.md`: agregar D-007 — acceso por DNI sin OTP es decisión de negocio (A2/A3 descartadas); registrar B2 y B3.
  3. `ia/projectmemory.md`: actualizar hotspots y riesgos resueltos (A1, A4).
  4. `ia/changelog.md`: registrar las mejoras al completarlas.
- Criterio: la doc refleja el estado real y las decisiones.

### B10 — Estabilizar Vite (SE REALIZA)
- Estado: hecho
- Pasos:
  1. Cuando `vite@8.x` estable esté publicado: quitar `overrides` de `package.json`, actualizar `vite` y `@vitejs/plugin-react`.
  2. Verificar `npm run build` y `npm run dev`.
- Criterio: build con versión estable sin overrides.

---

## Orden de ejecución sugerido
1. A1 → A4 → B5 → B7 (rápidos, desbloquean el resto)
2. B1 (análisis → tests) → B4 → B2
3. B3 → B8 → B10
