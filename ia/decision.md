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
- Consecuencia: la composicion HTTP sigue duplicada entre `server/index.js` y `netlify/functions/api.js`.

### D-006 - Acceso por DNI sin autenticacion fuerte

- Estado: vigente pero sensible
- Motivo: simplicidad del portal y bajo costo operativo.
- Consecuencia: es el riesgo funcional y de privacidad mas importante del sistema actual.

## Regla de actualizacion

Agregar una nueva decision cuando cambie alguna de estas dimensiones:

- Arquitectura general
- Contrato de datos relevante
- Integracion externa
- Seguridad o autenticacion
- Infraestructura base
