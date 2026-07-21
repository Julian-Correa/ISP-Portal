## Objetivo

Esta carpeta documenta el estado tecnico actual de `OriNet` para que cualquier IA o desarrollador pueda continuar el proyecto con contexto operativo y arquitectonico.

## Como usar esta carpeta

1. Leer primero `projectmemory.md`.
2. Revisar `architecture.md` para entender el sistema completo.
3. Consultar los documentos especificos segun la tarea: `api.md`, `components.md`, `business-rules.md`, `data-model.md`, `infrastructure.md`, `user-flows.md`.
4. Antes de cambiar comportamiento, revisar `decision.md`.
5. Al terminar un cambio relevante, actualizar `changelog.md` y, si hubo una decision de arquitectura, tambien `decision.md` y `projectmemory.md`.

## Reglas de mantenimiento

- `projectmemory.md`: memoria viva y estable del proyecto.
- `decision.md`: decisiones tecnicas y de producto con impacto persistente.
- `changelog.md`: cambios concretos realizados sobre el repo.
- No documentar supuestos como si fueran hechos.
- Si una parte del sistema no existe, dejarlo explicitado en vez de inventarlo.

## Fuentes de verdad actuales

- Frontend: `src/App.jsx`, `src/main.jsx`
- Backend local: `server/index.js`
- Backend serverless: `netlify/functions/api.js`
- Capas backend: `server/controllers`, `server/services`, `server/repositories`, `server/lib`, `server/config`
- Configuracion: `package.json`, `netlify.toml`, `.env.example`
- Contexto funcional: `README.md`

## Limites conocidos

- No hay base de datos propia en el repo.
- No hay suite automatizada de tests.
- El frontend esta concentrado casi por completo en `src/App.jsx`.
- La integracion principal depende de ISPCube como proveedor externo.

## Archivos incluidos

- `architecture.md`
- `api.md`
- `business-rules.md`
- `components.md`
- `data-model.md`
- `infrastructure.md`
- `user-flows.md`
- `decision.md`
- `projectmemory.md`
- `changelog.md`
