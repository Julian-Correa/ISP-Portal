## Reglas visibles del negocio

### Acceso al portal

- El cliente ingresa con DNI.
- El DNI valido tiene 7 u 8 digitos.
- Se eliminan puntos, espacios y cualquier caracter no numerico.

### Estado de cuenta

- `debt` representa deuda total base.
- `duedebt` representa deuda vencida.
- Si el servicio esta suspendido, se suma un recargo fijo de reconexion de `2000`.
- Si la deuda total queda en `0`, el estado visual es verde.
- Si la deuda total es mayor a `5000`, el estado visual es rojo.
- En cualquier otro caso con deuda, el estado visual es amarillo.

### Estado del servicio

- Estados considerados activos: `active`, `activo`, `enabled`.
- Estados considerados suspendidos: `blocked`, `bloqueado`, `block`, `suspended`, `suspendido`, `disabled`.
- Estado especial: `no_service`.

### Fecha de corte

- La fecha de corte se calcula con dia fijo `26`.
- Si la fecha actual ya paso ese dia del mes, se muestra el corte del mes siguiente.

### Facturacion y pagos

- El alias de pago es fijo: `orinet.isp.internet`.
- Si la API devuelve CBU en `customer.customer_cbu[0]`, tambien se muestra y se puede copiar.
- Si no hay factura disponible, la UI muestra un mensaje y no rompe el flujo.

### Contacto

- Existe un WhatsApp para administracion y otro para soporte tecnico.
- Cuando hay deuda, se enfatiza el flujo de enviar comprobante de pago.

### Email de facturacion

- Si el cliente ya tiene email, la UI entra en modo edicion.
- Si no tiene email, la UI entra en modo alta.
- El backend invalida la cache del resumen luego de guardar el email.

### Popup comercial

- Existe soporte para popup de imagen, pero hoy esta desactivado con `POPUP_CONFIG.enabled = false`.
