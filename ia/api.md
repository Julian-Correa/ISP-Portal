## Endpoints propios

### `GET /customer-summary`

#### Query params

- `dni`: obligatorio, 7 u 8 digitos, se sanitiza removiendo caracteres no numericos.

#### Respuesta exitosa `200`

```json
{
  "customer": {
    "id": 123,
    "code": "CLI-001",
    "name": "Nombre Apellido",
    "doc_number": "12345678",
    "address": "...",
    "debt": "0",
    "duedebt": "0",
    "status": "active",
    "city": { "name": "...", "province": "..." },
    "phones": [{ "number": "..." }],
    "customer_cbu": [{ "cbu": "...", "number": "..." }],
    "contact_emails": [{ "id": 1, "email": "...", "principal": 1 }]
  },
  "invoiceUrl": "https://...pdf",
  "planInfo": {
    "plan": "Plan 100 MB",
    "price": "$ 0,00"
  },
  "generatedAt": "2026-07-21T00:00:00.000Z"
}
```

#### Errores esperados

- `400`: `dni invalido` o equivalente
- `404`: `cliente no encontrado`
- `429`: demasiadas solicitudes
- `500`: configuracion incompleta o error interno serverless
- `502`: fallo consultando ISP en backend Express

#### Headers utiles

- `x-cache: HIT|MISS`

### `PUT /customers/:dni/email`

#### Body

```json
{
  "email": "cliente@dominio.com"
}
```

#### Reglas

- El email se normaliza con `trim().toLowerCase()`.
- Si el proveedor acepta el cambio, se invalida la cache de resumen por DNI.

#### Respuesta exitosa `200`

```json
{
  "customer": {
    "id": 123,
    "contact_emails": [{ "id": 1, "email": "cliente@dominio.com", "principal": 1 }]
  }
}
```

#### Errores esperados

- `400`: DNI o email invalidos
- `404`: cliente no encontrado
- `500`: configuracion incompleta / error interno
- `502`: error actualizando en el proveedor (ruta Express)

### `GET /health`

#### Respuesta

```json
{
  "ok": true,
  "redis": false
}
```

## Endpoints externos usados

- `POST /sanctum/token`
- `GET /customer?doc_number={dni}&deleted=false&temporary=false`
- `GET /bills/last_bill_api?customer_id={id}&monthly_bill=true&canceled=false`
- `GET /connection?...`
- `GET /plans/plans_list`
- `PUT /customers/{id}`

## Observaciones

- El frontend depende de que el backend siempre responda JSON.
- `invoiceUrl` es opcional.
- `planInfo` puede devolverse como `No informado` si la integracion no encuentra datos.
