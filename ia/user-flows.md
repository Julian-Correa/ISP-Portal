## Flujo 1: ingreso al portal

1. El usuario abre la SPA.
2. Ve la pantalla de login por DNI.
3. Ingresa DNI de 7 u 8 digitos.
4. La UI llama `GET /customer-summary`.
5. Si el backend responde ok, la UI guarda `session` en memoria y renderiza `ProfileScreen`.
6. Si falla, la UI muestra un mensaje controlado segun el status.

## Flujo 2: consultar deuda y factura

1. El usuario entra al perfil.
2. Ve deuda total, deuda vencida, estado de servicio, plan y medios de pago.
3. Si hay `invoiceUrl`, puede abrir la ultima factura en PDF.

## Flujo 3: copiar datos de pago

1. El usuario copia CBU si existe.
2. Siempre puede copiar el alias fijo.
3. La UI muestra feedback temporal de copiado.

## Flujo 4: enviar comprobante o pedir ayuda

1. Si hay deuda, la UI prioriza el CTA para enviar comprobante por WhatsApp.
2. El usuario tambien puede escribir a administracion por ayuda general.
3. Existe un canal separado para soporte tecnico.

## Flujo 5: registrar o editar email

1. El usuario escribe un email valido.
2. La UI llama `PUT /customers/:dni/email`.
3. Si sale bien, actualiza `session.customer` en memoria.
4. Si falla, muestra un error local y no rompe la sesion.

## Flujo 6: logout

1. El usuario toca `Cerrar sesion`.
2. La UI limpia `session` a `null`.
3. Vuelve a la pantalla de login.

## Flujo 7: popup comercial opcional

1. Si `POPUP_CONFIG.enabled` es `true`, se muestra un modal con imagen.
2. Se puede cerrar con click fuera, boton `x` o `Escape`.
