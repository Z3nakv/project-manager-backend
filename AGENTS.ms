---

## AI Coding Guidelines
Esta sección está dirigida a agentes de IA (Cline, Claude Code, Cursor Copilot, etc.) que modifiquen el código.
1. **Analiza patrones existentes antes de modificar código.** Revisa un controlador, servicio o middleware similar antes de crear uno nuevo. No asumas convenciones que no estén en el código.
2. **Mantén la separación Route → Middleware → Controller → Service.**
   - No accedas a la base de datos desde un controller.
   - No pongas lógica de validación en un service.
   - No definas rutas dentro de controladores.
3. **Reutiliza middlewares existentes.** El pipeline de `authenticate` → `projectExists` → `hasProjectAccess` → `hasAuthorization` cubre la mayoría de los casos. No crees nuevas verificaciones de autorización a menos que sea estrictamente necesario.
4. **Valida entradas antes de que lleguen al controlador.** Usa express-validator en la ruta y `handleInputErrors` como middleware. El controlador debe recibir datos ya validados.
5. **No dupliques servicios.** Antes de crear una función en `services/`, verifica si ya existe lo que necesitas en `projectService`, `taskService`, `notificationService` o `aiService`.
6. **Mantén tipado estricto.** Usa las interfaces de los modelos (`IUser`, `IProject`, `ITask`, etc.) y no tipes con `any`. Usa `Types.ObjectId` para referencias.
7. **Crea tests para lógica nueva.** Coloca los tests en `src/<carpeta>/__tests__/`. Usa `mongodb-memory-server` para tests que requieran BD. Sigue el patrón `describe` / `it` / `expect`.
8. **No modifiques configuraciones globales** (server.ts, index.ts, vitest.config.ts, tsconfig.json) sin justificación explícita.
9. **Mantén consistencia con las respuestas HTTP.** Usa `res.json({ message })` para éxito y `res.status(code).json({ error })` para errores.
10. **Los eventos de Socket.io deben seguir el naming existente.** Los eventos se definen como constantes en el frontend (`SocketEvents`) y se emiten con strings literales desde el backend. Mantén coherencia entre ambos lados.
---