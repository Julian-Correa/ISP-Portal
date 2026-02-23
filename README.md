# ISP-Portal

OriNet ISP Portal (Demo)

Portal de clientes para ISP (estilo OriNet) hecho en React: el cliente ingresa con su DNI, ve su saldo a abonar, deuda vencida, puede descargar la última factura y tiene accesos directos a WhatsApp para soporte o envío de comprobante.

Este archivo es una demo autocontenida (1 componente principal) con datos mockeados para pruebas.

✨ Funcionalidades

Login por DNI (validación 7/8 dígitos, sin puntos).

Búsqueda de cliente (en esta demo: MOCK_CUSTOMERS).

Pantalla de perfil con:

Saldo a abonar (con formato ARS).

Deuda vencida si corresponde.

Botón para descargar factura PDF.

Datos del cliente (domicilio, localidad, teléfono, código).

Botones para WhatsApp:

Soporte (mensaje prearmado).

Enviar comprobante (solo si hay deuda).

UI moderna con “glassmorphism”, gradientes, animaciones suaves.

Logo OriNet en SVG inline (gradientes + “globo” de conectividad).

🧱 Tecnologías

React (hooks: useState)

CSS inline (styles en objetos) + animaciones con @keyframes

APIs del navegador:

Intl.NumberFormat (moneda ARS)

encodeURIComponent (mensaje WhatsApp)

📁 Archivo principal

isp-portal.jsx (o el nombre que uses): contiene todo el portal:

configuración (WhatsApp / API)

datos mock

login screen

profile screen

íconos SVG

app principal

🚀 Cómo correrlo
Opción A — En un proyecto React (Vite recomendado)

Crear proyecto:

npm create vite@latest orinet-isp-portal -- --template react
cd orinet-isp-portal
npm install

Reemplazar src/App.jsx por el contenido del archivo.

Levantar:

npm run dev

Abrí la URL que te muestre la terminal.

Opción B — En Create React App (CRA)
npx create-react-app orinet-isp-portal
cd orinet-isp-portal
npm start

Reemplazá src/App.js por el contenido (ajustando extensión/exports si hace falta).

🔐 Credenciales de prueba (DNI)

La demo incluye clientes mockeados. Probá con:

26281212 → tiene deuda

33445566 → sin deuda

Si ingresás un DNI no existente, vas a ver el mensaje de error:
“No encontramos una cuenta asociada a ese DNI…”

🧪 Datos mock (demo)

Los clientes están definidos en:

const MOCK_CUSTOMERS = {
  "26281212": { ... },
  "33445566": { ... }
};

La función que simula la consulta:

async function fetchCustomerByDNI(dni) { ... }

Incluye un delay artificial (~1200ms) para simular red.

🧩 Configuración de WhatsApp

La integración usa wa.me con un mensaje prearmado:

const WHATSAPP_NUMBER = "541130921454";

Y la URL:

https://wa.me/<numero>?text=<mensaje>

🌐 Configuración de API (pendiente de implementar)

Existe un bloque de configuración:

const API_CONFIG = {
  BASE_URL: "http://ispdomain.com/api",
  API_KEY: "TU_API_KEY",
  COMPANY_ID: "TU_COMPANY_ID",
  USERNAME: "TU_USERNAME",
  TOKEN: "TU_TOKEN",
};

En esta demo no se usa todavía: el flujo funciona con MOCK_CUSTOMERS.
