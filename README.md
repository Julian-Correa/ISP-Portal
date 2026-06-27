
# Portal de Clientes — OriNet

Portal web para que los clientes del ISP puedan consultar su estado de cuenta, deuda y datos de pago, sin necesidad de contactar a administración.

---

## Funcionalidades

- **Login por DNI** — el cliente ingresa su DNI (7 u 8 dígitos, sin puntos ni espacios)
- **Saldo a abonar** — muestra la deuda en grande con código de colores (verde / amarillo / rojo)
- **Estado del servicio** — activo, suspendido o sin servicio, con la próxima fecha de corte
- **Datos para el pago** — alias `orinet.isp.internet` con botón para copiar al portapapeles
- **Descarga de factura** — link directo al PDF de la última factura
- **Datos de la cuenta** — domicilio, localidad, teléfono y código de cliente
- **Contacto por WhatsApp** — botones directos para enviar comprobante de pago o consultar con administración
- **Diseño responsive** — dos columnas en PC, una columna en celular

---

## Tecnologías

- React 19 + Vite
- Node.js + Netlify Functions para endpoint agregado (`/api/*`)
- Redis (opcional, con fallback en memoria)
- API ISPCube (`https://online25.ispcube.com/api`)

---

## Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Completar credenciales ISP_* en .env
```

### Desarrollo local (frontend + endpoint agregado)

```bash
# Terminal 1: backend agregado (cache Redis/memoria)
npm run server

# Terminal 2: frontend
npm run dev
```

---


## Reducción de requests al ISP (cache + endpoint agregado)

Se agrego un backend intermedio en Netlify Functions con endpoint:

- `GET /api/customer-summary?dni=12345678`

Ese endpoint:

1. Obtiene/reutiliza token de ISPCube (cacheado por TTL).
2. Consulta cliente por DNI.
3. Consulta última factura del cliente.
4. Devuelve un único payload para el frontend.
5. Cachea respuesta por DNI en Redis (`x-cache: HIT/MISS`).

Ejemplo de respuesta:

```json
{
  "customer": { "id": 123, "name": "..." },
  "invoiceUrl": "https://...pdf",
  "generatedAt": "2026-03-23T12:00:00.000Z"
}
```

El frontend usa `VITE_PORTAL_API_BASE` para llamar al backend agregado. En Netlify queda configurado como `/api` desde `netlify.toml`. Las credenciales de ISPCube no deben estar en el bundle publico.


## Estructura backend (Controller / Service / Repository)

Para escalar el proxy, el backend quedó separado en capas:

- `server/controllers/`: recibe HTTP, valida entrada/salida y códigos de estado.
- `server/services/`: orquesta reglas de negocio (cache, flujo de consulta).
- `server/repositories/`: encapsula acceso a ISPCube (token, customer, factura).
- `server/lib/`: utilidades técnicas compartidas (cache Redis + memoria).
- `server/config/`: variables de entorno y validaciones.
- `server/routes/`: mapeo de endpoints a controllers.

Flujo actual para `GET /customer-summary`:

1. Route -> `customerController.getCustomerSummary`
2. Controller -> `customerSummaryService.getSummaryByDni`
3. Service -> cache (`HIT`) o `ispRepository` (`MISS`)
4. Repository -> llamadas a ISPCube
5. Service devuelve payload y controller responde HTTP

## Deploy en Netlify

El proyecto ya incluye `netlify.toml`:

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- Redirect interno: `/api/*` -> `/.netlify/functions/api/:splat`

En Netlify no subas el archivo `.env`. Carga estas variables en **Site configuration -> Environment variables**:

```bash
CORS_ORIGIN=https://tu-sitio.netlify.app
CACHE_TTL_SECONDS=120
TOKEN_TTL_SECONDS=600
REQUEST_TIMEOUT_MS=12000
BODY_LIMIT=25kb
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=30
ISP_API_BASE=https://online25.ispcube.com/api
ISP_API_KEY=
ISP_CLIENT_ID=302
ISP_API_USER=
ISP_API_PASS=
```

`VITE_PORTAL_API_BASE` no hace falta cargarlo si usas este `netlify.toml`, porque queda seteado en `/api` durante el build.

Para desarrollo local con el servidor Express:

```bash
npm run server
npm run dev
```
## Configuracion de la API

Las credenciales viven en `.env` y son leidas solo por el backend:

```bash
ISP_API_BASE=https://online25.ispcube.com/api
ISP_API_KEY=
ISP_CLIENT_ID=302
ISP_API_USER=
ISP_API_PASS=
```

El portal usa autenticacion en dos pasos desde el servidor:
1. POST `/sanctum/token` -> obtiene Bearer token
2. GET `/customer?doc_number={dni}` -> trae los datos del cliente

El token se cachea en Redis o memoria del servidor durante `TOKEN_TTL_SECONDS`. En Netlify, si no configuras un Redis externo, se usa memoria por instancia warm de Function.
---

## Estructura del proyecto

```
orinet-portal/
├── src/
│   └── App.jsx        # Toda la aplicación (login + perfil + logo + API)
├── index.html         # Entry point — verificar que tenga el meta viewport
├── vite.config.js
└── package.json
```

---

## Personalización rápida

| Qué cambiar | Dónde |
|---|---|
| Alias de pago | Constante `ALIAS` en `App.jsx` |
| Número de WhatsApp | Constante `WHATSAPP_NUMBER` |
| Fecha de corte | Constante `CUT_DAY` |
| Colores del logo | Gradiente `textGrad` en el componente `OriNetLogo` |

---

## Notas

- El backend debe tener `CORS_ORIGIN` configurado con el dominio real del frontend en produccion.
- El CBU se lee del campo `customer_cbu[0]` de la API. Si viene vacio, solo se muestra el alias fijo.
- Rotar las credenciales que estuvieron expuestas en el frontend antes de este cambio.
