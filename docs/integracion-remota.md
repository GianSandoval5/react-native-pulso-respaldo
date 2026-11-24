# Sustituir MobileLab por un backend de producción

La aplicación depende del contrato `PowerRepository`, definido en el dominio. La composición de `App.tsx` inyecta `MobileLabPowerRepository`; no hay un backend remoto conectado ni una cuenta de usuario.

| Operación | Sandbox actual | Garantía esperada en producción |
| --- | --- | --- |
| `list()` | `GET /api/backup-plans` | Devolver únicamente los planes autorizados para la identidad autenticada. |
| `save(plan)` | `PUT /api/backup-plans/{id}` | Crear o reemplazar de forma idempotente un plan completo. |
| `remove(id)` | `DELETE /api/backup-plans/{id}` | Eliminar el plan autorizado y su historial según la política de retención. |

## Contrato recomendado

1. Publica el DTO de `mobilelab/seeds/backup-plans.json` como esquema OpenAPI y añade un campo de versión para concurrencia optimista.
2. Implementa otro adaptador de `PowerRepository` con un cliente HTTPS inyectado. Mantén el dominio y `PowerStore` sin dependencias de red.
3. Si el producto necesita cuentas, incorpora el flujo de acceso y una abstracción separada para obtener una credencial breve. Prueba 401, 403, renovación y revocación. El contrato local no define autenticación, por lo que esta versión no finge esas pruebas.
4. Autoriza cada plan en el servidor. Nunca confíes en el ID recibido desde la aplicación para determinar el propietario.
5. Envía una precondición de versión en cada escritura. Ante conflicto, refresca el documento y permite reconciliar los equipos o simulacros.
6. Cambia la composición en `App.tsx`, conserva las pruebas del dominio y del estado, y añade pruebas contractuales contra un entorno aislado del nuevo servicio.

Los cálculos de la app son estimaciones de planificación. La capacidad efectiva depende del equipo, la temperatura, la conversión y el estado de la batería. El backend de producción debe guardar las unidades explícitamente y aplicar límites de tamaño, auditoría y retención.
