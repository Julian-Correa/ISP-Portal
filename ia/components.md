## Frontend

Aunque el frontend esta en un solo archivo (`src/App.jsx`), logicamente se divide en estos componentes:

- `GlobalStyles`: reset basico global.
- `LoginScreen`: ingreso por DNI y primer fetch al backend.
- `ProfileScreen`: dashboard principal del cliente.
- `EmailCard`: alta/edicion del email de facturacion.
- `PopupImage`: popup opcional de comunicacion visual.
- `ErrorBoundary`: fallback si la UI crashea.
- `OriNetLogo`, `DownloadIcon`, `LogoutIcon`, `WhatsAppIcon`: presentacionales.

## Backend

### Entrada y composicion

- `server/index.js`: compone el backend local.
- `netlify/functions/api.js`: entrada serverless.

### Controllers

- `customerController`: traduce HTTP a llamadas del service.
- `healthController`: expone estado basico del proceso/cache.

### Services

- `CustomerSummaryService`: reglas de validacion, cache, payload final y coordinacion con el repository.

### Repository

- `IspRepository`: encapsula todas las llamadas HTTP al proveedor externo.

### Librerias tecnicas

- `CacheClient`: abstraccion minima entre Redis y cache en memoria.

## Acoplamientos importantes

- La UI conoce solo el contrato agregado del backend, no el de ISPCube.
- El backend local y el serverless comparten logica de servicio y repository, pero tienen entradas distintas.
- `src/App.jsx` concentra estado, render, estilos y llamadas HTTP; es el mayor punto de acoplamiento del frontend.

## Puntos de extension naturales

- Extraer el frontend en componentes y hooks reales.
- Centralizar cliente HTTP del frontend.
- Compartir adaptadores de respuesta/errores entre Express y Netlify para reducir divergencia.
