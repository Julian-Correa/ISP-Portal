## Estado base del proyecto

- Proyecto: portal de clientes de OriNet.
- Objetivo actual: permitir consulta por DNI, deuda, factura, plan, datos de pago y actualizacion de email.
- Frontend: SPA React con login y perfil separados, consumiendo reglas de negocio desde backend.
- Backend: proxy a ISPCube con runtime compartido (`app -> http -> service -> repository -> cache`).
- Deploy principal pensado para Netlify con function agregada en `/api`.

## Convenciones importantes

- La UI no debe hablar directo con ISPCube.
- Las credenciales viven en backend/env, nunca en el bundle.
- El contrato fuente para la UI es el payload agregado de `/customer-summary`.
- El fallback por defecto ante ausencia de Redis es memoria local.
- El repo no tiene DB propia; no asumir migraciones, ORM ni persistencia interna.

## Hotspots tecnicos

- `src/App.jsx`: archivo grande, mezcla logica, estilos, networking y vistas.
- `server/http/apiHandler.js`: concentra routing manual, CORS, rate limit y errores compartidos.
- Integracion ISPCube: proveedor externo con respuestas potencialmente inestables.

## Riesgos persistentes

- Seguridad debil por acceso basado solo en DNI.
- Rate limit por instancia y no distribuido.
- Dependencia fuerte de un proveedor externo con latencia y formatos no siempre consistentes.

## Riesgos resueltos recientemente

- `.env` ya no forma parte del flujo versionado del proyecto.
- `CORS_ORIGIN` es obligatorio y no existe fallback a `*`.
- El PUT de email valida `Origin` explicitamente.
- Express y Netlify usan el mismo handler HTTP.
- Hay tests automatizados para service, repository y endpoints.

## Prioridades razonables a futuro

1. Extraer el frontend en componentes/hooks modulares.
2. Revisar un rate limit distribuido si el trafico crece.
3. Mejorar observabilidad de errores del proveedor.
4. Revisar modelo de autenticacion si el portal va a escalar o exponer datos sensibles.

## Como seguir trabajando

1. Antes de tocar logica de negocio, revisar `business-rules.md` y `api.md`.
2. Antes de tocar deploy o entornos, revisar `infrastructure.md`.
3. Si un cambio altera una decision estable, actualizar `decision.md`.
4. Si un cambio ya fue implementado, registrarlo en `changelog.md`.
