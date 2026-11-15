# Paquetería: auditoría y decisiones previas

## Alcance y estado local

La inspección inicial de `git status` encontró cambios locales extensos sin commit en frontend y backend, incluyendo `AppDbContext`, `Paquete`, el snapshot, pruebas del backend y una primera versión de `PaqueteriaController`. Se preservarán esos cambios y se modificarán solo los archivos necesarios de Paquetería y sus migraciones. No hay cambios en `HEAD` que permitan asumir que las modificaciones locales son descartables.

## Auditoría inicial

- `Paquete` ya guarda destinatario, registrador, remitente, identificación, observaciones, fechas de recepción y confirmación, estado y fecha de eliminación. Los cambios locales añaden `FechaEntrega` y `IdUsuarioEntrega`.
- La relación con `Unidad` sigue siendo obligatoria (`int IdUnidad`, navegación no nullable) y es la única asociación del paquete con su edificio. `Paquete` no tiene `IdEdificio`; por ello el modelo impide representar el paquete de un residente sin unidad y no permite aislarlo directamente por edificio.
- `Usuario` ya contiene `IdEdificio` nullable, `Estado` (Activo/Desactivado), `IdRol` y relaciones opcionales con edificio/unidades. Las declaraciones comunitarias son independientes de `UsuarioUnidad`; el selector local usa esas declaraciones como referencia.
- `MensajePaquete` ya persiste paquete, emisor Identity, contenido y fecha. Su FK a paquete elimina en cascada mensajes; la FK a emisor restringe eliminación. No hay endpoints de chat.
- El controlador local solo implementa `GET /api/paqueteria/destinatarios`, con roles Administrador/Portero, usuario activo con edificio, residentes activos del mismo `IdEdificio` y sin requerir `UsuarioUnidad`. La consulta agrupa declaraciones y no duplica personas. La respuesta actual también expone el rol, que el contrato solicitado excluye.
- No existen endpoints backend locales para alta, recepción del personal, mis paquetes, entrega física, confirmación ni chat. Los flujos restantes del servicio Angular usan signals, datos de ejemplo y `Date.now`; incluyen un emisor ficticio con ID 0 y un residente temporal con ID fijo. Las pantallas no representan persistencia backend.
- Los roles existentes son Administrador, Portero, Inquilino, Propietario y SuperAdministrador. «Personal» se implementa con Portero; no hace falta crear un rol.
- Los atributos `[Authorize]` usan roles de claims Identity; el patrón backend local obtiene el usuario mediante `UserManager.GetUserAsync(User)` y valida `Estado`. Para Paquetería se debe obtener el edificio del usuario persistido, nunca de una solicitud.
- El estado actual de Paquete solo tiene el valor inicial por defecto `Pendiente`; no existe catálogo ni flujo tipado que defina las dos fases.

## Migraciones encontradas

La secuencia incluye `InitialCreate`, `ActualizarModeloVecinApp`, `AgregarChatPaqueteria`, migraciones de incidencia/notificación, migraciones locales de edificio/registro comunitario y `20261115082037_AgregarEntregaPaqueteYRemitente`. Esta última añade `fecha_entrega`, `id_usuario_entrega` con índice/FK restrictiva y `remitente` no nulo con valor predeterminado vacío. Es coherente con el modelo local actual y debe conservarse. Su diseñador refleja aún `IdUnidad` obligatorio. El snapshot local también conserva `IdUnidad` obligatorio y ya refleja las columnas de entrega/remitente.

La enumeración sin conexión de EF (`migrations list --no-connect`) mostró diez migraciones locales hasta `20261115103357_PaqueteConEdificio`. No se consultó `__EFMigrationsHistory`, así que el estado aplicado de una base concreta no se infiere de esa lista.

## Validación de diseño y decisiones

1. **Ámbito del paquete:** añadir una FK obligatoria a `Edificio` y conservar la unidad como `int?` informativa opcional. La nueva FK da aislamiento directo y permite residentes sin `UsuarioUnidad` y sin unidad declarada; no se asignará unidad ficticia. Migración aditiva: añadir `id_edificio` nullable para filas históricas, poblarla desde `unidad.id_edificio`, luego hacerla requerida; convertir `id_unidad` a nullable sin borrar la columna ni los datos. Debe comprobarse el caso de filas históricas sin unidad antes de aplicar la migración. La migración de entrega/remitente se conserva intacta.
2. **Destinatario:** validar cuenta activa, `IdEdificio` coincidente y rol de aplicación Inquilino/Propietario. La consulta de selector toma `Usuario.IdEdificio`; las declaraciones/unidades son referencias únicamente y nunca autorizan ni condicionan el paquete.
3. **Estados:** usar los valores string ya usados por la UI (`Pendiente`, `Entregado`, `Confirmado`) para evitar un catálogo paralelo y realizar transiciones explícitas: alta → Pendiente; personal → Entregado con `FechaEntrega`/`IdUsuarioEntrega`; destinatario → Confirmado con `FechaConfirmacion`. El estado existente aún no contiene el estado intermedio en uso; esto documenta el contrato y debe implementarse con la mínima transición explícita.
4. **Chat:** restringir lectura/escritura al destinatario del paquete o a Administrador/Portero activo del mismo edificio. Derivar emisor de la sesión autenticada; guardar en BD su ID real y devolver cronológicamente solo ID del mensaje, nombre/apellido visible, contenido y fecha. No hay evidencia de infraestructura de tiempo real para reutilizar.
5. **Retención:** mantener `FechaEliminacion` sin automatización ni borrado; no ocultar paquetes antes de confirmar. La retención de cuatro días desde confirmación queda aplazada.

## Riesgos y compatibilidad

- El contrato Angular de paquete usa IDs numéricos del lado residente, campos de edificio/unidad/descripcion y estados `pendiente`/`entregado`; el backend necesita Identity `string`, identificación y una tercera fase Confirmado. El frontend debe adaptarse después o mediante DTO explícito. En esta entrega se documentarán DTOs/rutas sin integrar Angular.
- La migración de edificio deberá preservar filas existentes y ser revisada en una base de prueba antes de aplicación, especialmente si hubiese paquetes cuyo `IdUnidad` no encuentre una unidad válida.
- La migración local solicitada no puede modificarse destructivamente; la migración nueva debe seguirla cronológicamente y el snapshot debe describir el modelo final.

## Contrato backend previsto para conectar Angular

Todos los IDs de usuario son strings Identity; la identidad del actor y el edificio nunca se aceptan desde el cliente.

| Método y ruta | Roles | Uso |
|---|---|---|
| `GET /api/paqueteria/destinatarios` | Administrador, Portero | Residentes activos del edificio y referencias declaradas no verificadas |
| `POST /api/paqueteria` | Administrador, Portero | Alta; destinatario, remitente, identificación y observaciones |
| `GET /api/paqueteria` | Administrador, Portero | Recepción del edificio |
| `GET /api/paqueteria/mis-paquetes` | Inquilino, Propietario | Paquetes propios derivados de la sesión |
| `POST /api/paqueteria/{id}/entrega` | Administrador, Portero | Registro de entrega física |
| `POST /api/paqueteria/{id}/confirmacion` | Inquilino, Propietario | Confirmación del destinatario |
| `GET /api/paqueteria/{id}/mensajes` | Participante autorizado | Historial persistido en orden cronológico |
| `POST /api/paqueteria/{id}/mensajes` | Participante autorizado | Nuevo mensaje; emisor/fecha del backend |

La forma concreta de DTOs y códigos de error debe seguir el estilo existente del backend y quedar reflejada en las pruebas.

## Implementación completada

- La entidad/contexto y el snapshot ahora modelan `Paquete.IdEdificio` requerido, `Paquete.IdUnidad` opcional, más las FK de edificio y unidad restrictivas.
- `20261115103357_PaqueteConEdificio` crea temporalmente `id_edificio` nullable, copia el edificio desde `unidad` para conservar filas previas, la vuelve requerida, y agrega índice/FK. También vuelve nullable `id_unidad` sin quitar su columna ni relación. En `Down`, se interrumpe la reversión si hay paquetes sin unidad para no asignar unidades ficticias.
- La migración local `20261115082037_AgregarEntregaPaqueteYRemitente` se conserva sin cambios.
- El controlador implementa los ocho endpoints de la tabla anterior. El chat persiste el ID real del emisor, pero no lo devuelve en el DTO. Los mensajes se ordenan por fecha e ID.
- El selector responde ID string, nombre, apellido y referencias declaradas con estado explícito `No verificada`; no devuelve rol, email ni datos de cuenta.
- No se modificó Angular. El servicio y pantallas locales siguen usando señales/datos locales salvo la consulta de destinatarios; la integración del resto queda pendiente. El backend no devuelve esos datos locales ni los usa como persistencia.
- Pruebas HTTP con TestServer e InMemory verifican permisos, edificio, destinatarios, alta sin unidad, fechas/actores, aislamiento, ambas etapas, confirmación duplicada, persistencia/identidad del chat y orden cronológico. Los datos de prueba están confinados al proyecto automatizado.
