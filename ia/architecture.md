## Resumen

`OriNet` es un portal de clientes para un ISP. El sistema tiene tres piezas principales:

1. Un frontend SPA en React/Vite.
2. Un backend proxy para proteger credenciales y simplificar llamadas al proveedor.
3. Una integracion externa con ISPCube, con cache opcional en Redis y fallback en memoria.

## Vista de alto nivel

```text
Cliente web
  -> React SPA (`src/App.jsx`)
  -> API agregada (`/customer-summary`, `/customers/:dni/email`, `/health`)
  -> Service layer (`CustomerSummaryService`)
  -> Repository layer (`IspRepository`)
  -> ISPCube API
  -> Cache Redis o memoria
```

## Modos de ejecucion

### Desarrollo local

- Frontend: `npm run dev`
- Backend: `npm run server`
- `VITE_PORTAL_API_BASE` suele apuntar a `http://localhost:8787`

### Produccion Netlify

- El frontend se publica desde `dist`
- `/api/*` redirige a `netlify/functions/api.js`
- `VITE_PORTAL_API_BASE` se fija en `/api` desde `netlify.toml`

## Componentes principales

### Frontend

- `src/main.jsx`: bootstrap React.
- `src/App.jsx`: login, perfil, popup, manejo de errores, llamadas HTTP y rendering completo.

### Backend local

- `server/index.js`: compone Express, CORS, headers de seguridad, rate limiting, cache, rutas y dependencias.

### Backend serverless

- `netlify/functions/api.js`: adapta la misma logica de negocio al runtime de Netlify Functions.

### Logica de negocio

- `server/services/customerSummaryService.js`: valida entrada, orquesta cache y arma el payload consumido por la UI.

### Integracion externa

- `server/repositories/ispRepository.js`: token, cliente, factura, conexion, plan y actualizacion de email contra ISPCube.

### Cache

- `server/lib/cache.js`: usa Redis si esta disponible; si no, usa memoria local con TTL.

## Flujos clave

### Consulta por DNI

1. La UI llama `GET /customer-summary?dni=...`.
2. El backend valida DNI.
3. Busca cache `isp:summary:{dni}`.
4. Si no hay cache, obtiene token ISPCube.
5. Busca cliente por DNI.
6. Busca factura, conexion y plan.
7. Sanitiza la respuesta.
8. Cachea el resumen y responde a la UI.

### Actualizacion de email

1. La UI llama `PUT /customers/:dni/email`.
2. El backend valida DNI y email.
3. Busca cliente en ISPCube.
4. Ejecuta `PUT /customers/{id}` en el proveedor.
5. Invalida cache del resumen por DNI.
6. Devuelve el cliente saneado con el email actualizado.

## Restricciones arquitectonicas actuales

- No existe autenticacion real ni sesion persistida; el acceso se basa solo en DNI.
- La UI no tiene router, store global ni separacion fuerte por componentes.
- El rate limit es en memoria, por proceso/instancia.
- La arquitectura depende del contrato de ISPCube y puede romperse si el proveedor cambia respuestas.
