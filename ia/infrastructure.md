## Stack tecnico

- Frontend: React 19 + Vite 8 beta
- Backend local: Node.js + Express 5
- Backend deploy: Netlify Functions
- Cache: Redis opcional, fallback en memoria
- Integracion externa: ISPCube API

## Scripts disponibles

- `npm run dev`: frontend Vite
- `npm run build`: build de produccion
- `npm run lint`: linting ESLint
- `npm run preview`: preview del build
- `npm run server`: backend Express local

## Variables de entorno relevantes

### Frontend

- `VITE_PORTAL_API_BASE`

### Backend

- `PORT`
- `CORS_ORIGIN`
- `REDIS_URL`
- `CACHE_TTL_SECONDS`
- `TOKEN_TTL_SECONDS`
- `REQUEST_TIMEOUT_MS`
- `BODY_LIMIT`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`
- `ISP_API_BASE`
- `ISP_API_KEY`
- `ISP_CLIENT_ID`
- `ISP_API_USER`
- `ISP_API_PASS`

## Deploy actual

- `netlify.toml` define build, publish dir y functions dir.
- `dist/` contiene el artefacto generado del frontend.
- `/api/*` redirige a `/.netlify/functions/api/:splat`.

## Seguridad actual

- Las credenciales del proveedor se leen solo en backend.
- Se desactiva `x-powered-by` en Express.
- Se agregan headers basicos: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- Hay rate limit en memoria sobre endpoints sensibles.

## Limitaciones operativas

- El rate limit en memoria no es global.
- El cache en memoria de Netlify depende de instancias warm y no es persistente.
- Sin Redis, el rendimiento y la reutilizacion de token/resumen dependen del proceso actual.

## Carpetas a no usar como fuente de verdad funcional

- `dist/`: output generado
- `node_modules/`: dependencias instaladas
- `.env`: contiene configuracion local, no debe documentarse con secretos
