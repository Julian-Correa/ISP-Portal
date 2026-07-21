## Resumen

El proyecto no tiene base de datos propia. El modelo de datos actual proviene de:

1. Respuestas de ISPCube.
2. Cache temporal en Redis o memoria.
3. Estado efimero en el navegador (`session` en React).

## Entidades principales

### Customer

Campos consumidos o expuestos por la UI/backend:

- `id`
- `code`
- `name`
- `doc_number`
- `address`
- `debt`
- `duedebt`
- `status`
- `city.name`
- `city.province`
- `phones[0].number`
- `customer_cbu[0].cbu`
- `customer_cbu[0].number`
- `contact_emails[0].id`
- `contact_emails[0].email`
- `contact_emails[0].principal`

### Summary payload

El backend agrega esta estructura para el frontend:

- `customer`
- `invoiceUrl`
- `planInfo.plan`
- `planInfo.price`
- `generatedAt`

### Connection

Dato auxiliar del proveedor. Se usa principalmente para encontrar `plan_id`.

### Plan

Dato auxiliar del proveedor. Se usan sobre todo:

- `id`
- `name`
- `price`

## Cache keys

- Token del proveedor: `isp:token`
- Resumen por DNI: `isp:summary:{dni}`

## Persistencia real

- Redis: opcional, externa al repo.
- Memoria local: fallback no compartido entre procesos ni instancias serverless.
- Browser state: se pierde al recargar la pagina.

## Implicancias

- No existe historico propio ni auditoria dentro del repo.
- Cualquier cambio estructural fuerte en los datos debe pensarse en funcion del contrato de ISPCube.
- Si en el futuro se agrega una base propia, este documento debe evolucionar de modelo derivado a modelo persistente.
