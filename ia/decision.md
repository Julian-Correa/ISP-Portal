## Decisiones vigentes

### D-001 - Usar backend intermedio para ISPCube

- Estado: vigente
- Motivo: evitar exponer credenciales y reducir complejidad en el frontend.
- Consecuencia: cualquier evolucion funcional relevante pasa por el backend agregado.

### D-002 - Cachear token y resumen de cliente

- Estado: vigente
- Motivo: bajar cantidad de requests al proveedor y mejorar tiempos de respuesta.
- Consecuencia: hay que invalidar cache al actualizar email y considerar TTLs al depurar problemas.

### D-003 - Redis opcional con fallback en memoria

- Estado: vigente
- Motivo: permitir desarrollo simple y deploy sin dependencia obligatoria.
- Consecuencia: el comportamiento no es identico entre entornos con y sin Redis.

### D-004 - Mantener una SPA sin router

- Estado: vigente
- Motivo: el producto actual tiene un flujo unico y acotado.
- Consecuencia: `src/App.jsx` quedo muy concentrado y es el principal candidato a refactor futuro.

### D-005 - Reusar service/repository entre Express y Netlify

- Estado: vigente
- Motivo: reducir logica duplicada del dominio.
- Consecuencia: el runtime compartido vive en `server/app/` y la capa HTTP canonica vive en `server/http/apiHandler.js`.

### D-006 - Acceso por DNI sin autenticacion fuerte

- Estado: vigente pero sensible
- Motivo: simplicidad del portal y bajo costo operativo.
- Consecuencia: es el riesgo funcional y de privacidad mas importante del sistema actual.

### D-007 - No agregar OTP ni mitigaciones de enumeracion en esta etapa

- Estado: vigente
- Motivo: el acceso por DNI sin OTP es una decision de negocio explicita para el portal actual.
- Consecuencia: no se deben proponer OTP por WhatsApp/email ni cambios de enmascaramiento como mejora por defecto para este proyecto.

### D-008 - Netlify handler como fuente canonica de HTTP

- Estado: vigente
- Motivo: eliminar drift entre runtime local Express y runtime serverless sin sumar dependencias nuevas.
- Consecuencia: CORS, rate limit, validaciones y manejo de errores viven en un unico handler compartido.

### D-009 - Reglas de cobro configuradas desde backend

- Estado: vigente
- Motivo: permitir cambiar recargos y dia de corte sin redeploy del frontend.
- Consecuencia: `customer-summary` ahora expone `recargoReconexion`, `recargoSegundoVencimiento` y `cutDay`.

## Regla de actualizacion

Agregar una nueva decision cuando cambie alguna de estas dimensiones:

- Arquitectura general
- Contrato de datos relevante
- Integracion externa
- Seguridad o autenticacion
- Infraestructura base
