
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
- Node.js + Express para endpoint agregado
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

Se agregó un backend intermedio en `server/index.js` con endpoint:

- `GET /customer-summary?dni=12345678`

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

El frontend ahora usa `VITE_PORTAL_API_BASE` para llamar ese endpoint agregado y, si falla, hace fallback al flujo anterior directo al ISP.


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

## Deploy

```bash
# Generar build de producción
npm run build

# La carpeta dist/ contiene los archivos listos para subir al servidor
```

Subir el contenido de `dist/` a cualquier hosting estático:
- **Netlify** — arrastrar la carpeta `dist/` en netlify.com/drop
- **Vercel** — conectar el repo y hace deploy automático
- **Servidor propio** — copiar `dist/` a `/var/www/html` o equivalente

---

## Configuración de la API

Las credenciales están al inicio de `App.jsx`:

```js
const API_BASE  = "https://online25.ispcube.com/api";
const API_KEY   = "...";
const CLIENT_ID = "302";
const API_USER  = "...";
const API_PASS  = "...";
```

El portal usa autenticación en dos pasos:
1. POST `/sanctum/token` → obtiene Bearer token
2. GET `/customer?doc_number={dni}` → trae los datos del cliente

El token se cachea en memoria durante la sesión. Si expira, se le indica al usuario que recargue la página.

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

- La app requiere que el servidor de la API tenga **CORS habilitado** para el dominio desde donde se sirve el portal.
- El campo `last_invoice_url` debe venir en la respuesta de la API para que funcione el botón de descarga de factura.
- El CBU se lee del campo `customer_cbu[0]` de la API. Si viene vacío, solo se muestra el alias fijo.
