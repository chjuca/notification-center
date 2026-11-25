# Notification Center

Sistema de gestión de notificaciones para usuarios autenticados. Cada usuario crea, modifica, elimina y consulta sus propias notificaciones, y cada notificación se envía al crearse por el canal elegido: email, SMS o push.

Los envíos son simulados, como pide el enunciado: cada canal valida, transforma y registra lo que enviaría, sin llamar a un proveedor real.

## Funcionalidades

- Registro con email y contraseña, y login que devuelve un token de acceso (JWT).
- Todos los endpoints exigen un token válido, salvo registro y login.
- CRUD de notificaciones. Cada usuario ve y modifica solo las suyas.
- Envío por canal al crear, con lógica propia en cada uno:
  - **Email:** valida el formato del destinatario y genera un template HTML.
  - **SMS:** valida el teléfono y recorta el texto a 160 caracteres.
  - **Push:** valida el token de dispositivo y arma el payload.
- Historial de cada envío, con su estado, fecha y lo que se envió.
- Documentación interactiva con Swagger.
- Frontend mínimo para usar todo desde el navegador.

## Cómo levantarlo

Requiere Docker con Compose v2, y los puertos 3000, 3001 y 5440 libres.

```bash
docker compose up --build
```

Levanta la base de datos, la API (que aplica las migraciones al arrancar) y el frontend.

| Qué | Dónde |
| --- | --- |
| Frontend | http://localhost:3000 |
| Swagger | http://localhost:3001/docs |

Para probar desde Swagger: registrarse en `POST /auth/register`, obtener el token en `POST /auth/login`, pegarlo con el botón **Authorize**, y usar el resto de los endpoints.

## Cómo correr los tests

Requiere, además de Docker, Node 22 y pnpm 10 (`corepack enable` lo instala).

```bash
pnpm install
pnpm test
```

Ese comando levanta Postgres y corre, en orden:

| Grupo | Comando por separado | Qué cubre |
| --- | --- | --- |
| Unitarios | `pnpm test:unit` | Servicios y canales, sin base de datos |
| API de punta a punta | `pnpm test:api` | Cada endpoint contra un Postgres real |
| Navegador | `pnpm test:web` | El flujo completo de un usuario, con Playwright |

Los tests usan su propia base, `notification_center_test`, que se crea sola. La primera corrida de los tests de navegador descarga Chromium.

## API

| Método y ruta | Qué hace | Token |
| --- | --- | --- |
| `POST /auth/register` | Crea una cuenta | No |
| `POST /auth/login` | Devuelve el token de acceso | No |
| `GET /health` | Indica si la API y su base responden | No |
| `GET /channels` | Lista los canales disponibles | Sí |
| `POST /notifications` | Crea una notificación y la envía | Sí |
| `GET /notifications` | Lista las propias, paginadas | Sí |
| `PATCH /notifications/:id` | Modifica una propia. No la reenvía | Sí |
| `DELETE /notifications/:id` | Elimina una propia | Sí |

El detalle de cada cuerpo, respuesta y error está en Swagger.

## Arquitectura de los canales

Los canales siguen el patrón Strategy. Todos cumplen el mismo contrato, en `apps/api/src/notifications/channels/notification-channel.ts`:

```ts
export interface NotificationChannel {
  readonly name: string;
  validate(message: ChannelMessage): string[];
  send(message: ChannelMessage): Promise<DeliveryDetails>;
}
```

Un registro (`ChannelRegistry`) los guarda por nombre. El servicio de notificaciones pide el canal al registro y lo usa, sin saber cuál es. No hay ningún `switch` ni `if` por canal en el código.

Al crear una notificación:

1. Se busca el canal por su nombre. Si no existe, la API responde `400` con la lista de canales disponibles.
2. El canal valida el mensaje. Si lo rechaza, `400` y no se guarda nada.
3. Se guarda la notificación.
4. El canal la envía.
5. Se registra el resultado en `notification_deliveries`, como `sent` o `failed`.

### Agregar un canal

Son dos pasos, y ninguno modifica lógica existente.

1. Crear la clase:

```ts
@Injectable()
export class WhatsappChannel implements NotificationChannel {
  readonly name = 'whatsapp';

  validate({ recipient }: ChannelMessage): string[] {
    return /^\+[1-9]\d{7,14}$/.test(recipient)
      ? []
      : ['recipient must be a phone number in international format'];
  }

  send({ title, content, recipient }: ChannelMessage): Promise<DeliveryDetails> {
    return Promise.resolve({ to: recipient, body: `*${title}*\n${content}` });
  }
}
```

2. Sumarla a la lista en `channels.module.ts`:

```ts
const CHANNELS = [EmailChannel, SmsChannel, PushChannel, WhatsappChannel];
```

Con eso el canal ya se valida, se envía, queda registrado, aparece en `GET /channels` y en el desplegable del frontend. No hace falta una migración, porque el canal se guarda como texto.

## Decisiones técnicas

**Modelo de datos**

- **Campo `recipient` en la notificación.** El enunciado pide título, contenido y canal, pero cada canal necesita un destino que validar. Se agregó un cuarto campo, cuyo formato valida el canal elegido. La alternativa, guardar los datos de contacto en el usuario, exigiría una columna nueva por cada canal.
- **`channel` es texto, no un enum de la base.** Así un canal nuevo no requiere migración. La API garantiza que el valor corresponda a un canal registrado.
- **Tabla `notification_deliveries` para los envíos.** Separa lo que escribe el usuario de lo que hizo el sistema. Guarda una copia del canal y del destinatario, de modo que el historial sigue siendo cierto aunque la notificación se edite después.
- **`details` en JSONB.** Cada canal guarda datos distintos (el HTML del email, el payload del push) sin agregar columnas.
- **Migraciones versionadas, sin `synchronize`.** El esquema cambia solo mediante archivos revisables. La API las aplica al arrancar.

**Envío**

- **Síncrono.** El envío ocurre dentro de la petición que crea la notificación. Los canales no conocen HTTP ni la base de datos, así que moverlos a una cola cambiaría solo quién los invoca.
- **Solo se envía al crear,** como indica el enunciado. Modificar valida de nuevo contra el canal, pero no reenvía.
- **Un destinatario inválido responde `400` y no guarda nada.** Un fallo inesperado del canal responde `201` y registra el envío como `failed` con su motivo: la notificación se creó, y eso es lo que se informa.
- **Guardar, enviar, registrar, sin transacción.** Un envío real no se puede deshacer. Guardando primero, un fallo intermedio deja una notificación visible y sin registro, en lugar de un mensaje enviado sin rastro.

**Autenticación y autorización**

- **Contraseñas con argon2id.** Es lento y costoso en memoria a propósito, lo que encarece probar contraseñas si la base se filtra.
- **JWT firmado con HS256, de una hora.** El algoritmo está fijado al verificar, para no aceptar tokens firmados de otra forma. El token solo lleva el id del usuario.
- **Guard global.** Todo endpoint exige token salvo que se marque con `@Public()`. Un endpoint nuevo nace protegido.
- **La pertenencia está en la consulta.** Las notificaciones se buscan siempre por `id` y `userId` juntos. Una notificación ajena responde `404`, igual que una inexistente, y no hay una comprobación aparte que se pueda olvidar.
- **El login responde lo mismo** si el email no existe o la contraseña es incorrecta.

**Validación y documentación**

- **Esquemas de zod.** El mismo esquema valida la petición y genera su documentación en Swagger, así que no pueden contradecirse.
- **Variables de entorno validadas al arrancar.** Si falta una o es inválida, la API no levanta.

**Seguridad**

- **Límite de peticiones:** 5 por minuto en registro y login, 100 por minuto en el resto, por IP. Es un guard propio con un contador en memoria.
- **Cabeceras de seguridad** en todas las respuestas, y **CORS** restringido a los orígenes configurados.
- **Dependencias sin telemetría:** se quitó la que traía el generador de NestJS.

**Estructura**

- **Monorepo con pnpm workspaces.** Un solo clon, una sola instalación, y la API y el frontend siempre en versiones compatibles.
- **API separada del frontend.** La puede consumir cualquier cliente.

## Tecnologías

| Parte | Tecnología |
| --- | --- |
| API | NestJS 12, TypeORM 1.1, zod 4, argon2 |
| Base de datos | PostgreSQL 17 |
| Frontend | Next.js 16, React 19, Bootstrap 5 |
| Tests | Vitest 4, Supertest, Playwright |
| Entorno | Node 22, pnpm 10, Docker |

## Desarrollo

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm db:up      # solo Postgres
pnpm dev:api    # API en http://localhost:3001, con recarga
pnpm dev:web    # frontend en http://localhost:3000, con recarga
```

| Comando | Qué hace |
| --- | --- |
| `pnpm start` / `pnpm stop` | Levanta o apaga todo en Docker |
| `pnpm db:up` / `pnpm db:down` | Levanta o apaga solo Postgres |
| `pnpm lint` | Linter de ambas apps |
| `pnpm --filter api migration:generate src/database/migrations/Nombre` | Genera una migración a partir de las entidades |

Una migración nueva se suma a la lista de `apps/api/src/database/migrations/index.ts`.

## Variables de entorno

Los valores de ejemplo están en `apps/api/.env.example` y `apps/web/.env.example`.

| Variable | App | Para qué | Por defecto |
| --- | --- | --- | --- |
| `DATABASE_URL` | API | Conexión a Postgres | Obligatoria |
| `JWT_SECRET` | API | Firma de los tokens. Mínimo 32 caracteres | Obligatoria |
| `JWT_EXPIRES_IN_SECONDS` | API | Duración del token | `3600` |
| `PORT` | API | Puerto | `3001` |
| `CORS_ORIGINS` | API | Orígenes permitidos, separados por coma | `http://localhost:3000` |
| `TRUST_PROXY_HOPS` | API | Proxies delante de la API, para obtener la IP real | `0` |
| `SWAGGER_ASSETS` | API | De dónde carga Swagger su interfaz: `bundled` (de la propia API) o `cdn` | `bundled` |
| `NEXT_PUBLIC_API_URL` | Web | URL de la API. Se fija al compilar | `http://localhost:3001` |

Con Docker Compose no hace falta ningún `.env`: los valores locales están en `docker-compose.yml`. El `JWT_SECRET` de ese archivo sirve solo para una máquina local.

## Limitaciones y posibles mejoras

- **Envío asíncrono con una cola.** En producción, la API publicaría un mensaje en una cola (por ejemplo Amazon SQS) y un proceso aparte haría el envío, con reintentos y una cola de mensajes fallidos. Los canales no cambiarían.
- **Proveedores reales.** Conectar un canal a un proveedor es reemplazar el cuerpo de su método `send`.
- **Verificar que el destinatario pertenece al usuario.** Hoy un usuario autenticado puede indicar cualquier destino. Con envíos reales habría que confirmar el email o el teléfono, para que la API no sirva de medio de spam.
- **El límite de peticiones vive en memoria y es por IP.** Sirve con una sola instancia. Con varias haría falta un almacén compartido, como Redis, y convendría limitar además por cuenta.
- **El registro revela si un email ya existe,** al responder `409`. Ocultarlo requiere un flujo con confirmación por correo.
- **Sin token de refresco.** La sesión dura una hora y luego hay que volver a entrar.
- **El frontend guarda el token en `localStorage`.** Una cookie `httpOnly` lo protegería mejor ante una inyección de scripts, a cambio de manejar cookies y CSRF en la API.
- **Swagger es público.** Es una decisión para la demo; en producción iría deshabilitado o detrás de autenticación.
- **El recorte del SMS usa siempre 160 caracteres.** En la práctica el límite baja a 70 si el texto lleva caracteres fuera del alfabeto básico.
- **La validación del token de push es de formato.** Un token real solo lo puede validar el proveedor.
- **Observabilidad.** Trazas, métricas y alertas sobre los envíos fallidos.
