## Estado base del proyecto

- Proyecto: portal de clientes de OriNet.
- Objetivo actual: permitir consulta por DNI, deuda, factura, plan, datos de pago y actualizacion de email.
- Frontend: SPA React casi completa en `src/App.jsx`.
- Backend: proxy a ISPCube con capas claras (`controller -> service -> repository -> cache`).
- Deploy principal pensado para Netlify con function agregada en `/api`.

## Convenciones importantes

- La UI no debe hablar directo con ISPCube.
- Las credenciales viven en backend/env, nunca en el bundle.
- El contrato fuente para la UI es el payload agregado de `/customer-summary`.
- El fallback por defecto ante ausencia de Redis es memoria local.
- El repo no tiene DB propia; no asumir migraciones, ORM ni persistencia interna.

## Hotspots tecnicos

- `src/App.jsx`: archivo grande, mezcla logica, estilos, networking y vistas.
- `netlify/functions/api.js`: entrada extensa con routing manual y concerns HTTP mezclados.
- Integracion ISPCube: proveedor externo con respuestas potencialmente inestables.

## Riesgos persistentes

- Seguridad debil por acceso basado solo en DNI.
- Sin tests automatizados para flujos criticos.
- Rate limit por instancia y no distribuido.
- Diferencias potenciales entre runtime local Express y runtime serverless.

## Prioridades razonables a futuro

1. Extraer el frontend en componentes/hooks modulares.
2. Agregar tests minimos de backend para service/repository boundaries.
3. Unificar mas la capa HTTP entre Express y Netlify.
4. Revisar modelo de autenticacion si el portal va a escalar o exponer datos sensibles.

## Como seguir trabajando

1. Antes de tocar logica de negocio, revisar `business-rules.md` y `api.md`.
2. Antes de tocar deploy o entornos, revisar `infrastructure.md`.
3. Si un cambio altera una decision estable, actualizar `decision.md`.
4. Si un cambio ya fue implementado, registrarlo en `changelog.md`.
