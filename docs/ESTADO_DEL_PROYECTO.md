# Estado del proyecto — Ecommerce MVP

Documento de traspaso. Describe el proyecto tal como está en el código (rama `main`). Si algo aquí contradice al código, manda el código.

> **Nunca guardes valores de variables de entorno, contraseñas ni cadenas de conexión en este archivo ni en el repositorio.**

## 1. Qué es

Tienda en línea de tecnología (laptops, celulares, audio, monitores, periféricos, tablets, componentes y wearables) hecha como MVP de demostración. Un cliente puede navegar el catálogo, buscar, armar un carrito (también como invitado), pagar con un checkout por pasos y seguir su pedido. Soporte y administración gestionan pedidos, productos y usuarios desde un panel.

**Los pagos son simulados: no existe ninguna pasarela real y nunca se cobra dinero.**

| Pieza | URL de producción |
|---|---|
| Frontend (Vercel) | _Completar: la URL real no está en el repositorio_ |
| Backend / API (Render) | _Completar: la URL real no está en el repositorio_ |
| Base de datos (Neon) | Una sola base de datos, **compartida entre desarrollo local y producción** |

## 2. Stack y estructura

- **Frontend:** React 19, Vite 8, TypeScript, Tailwind CSS 3, React Router 7, `lucide-react` (íconos). Sin librerías de componentes ni de gráficos.
- **Backend:** Node.js, Express 4, TypeScript, Prisma 5, PostgreSQL (Neon), JWT (`jsonwebtoken`, vigencia de 7 días), `bcrypt` (10 rondas), `express-rate-limit`.

```
ecommerce-mvp/
├── package.json            # script "dev" que levanta backend y frontend con concurrently
├── README.md               # guía de instalación inicial (ver "Limitaciones": está parcialmente desactualizada)
├── REQUERIMIENTOS_TECNICOS_MVP.md, PROMPT_SPRINT*_CLAUDE_CODE.md   # requisitos y prompts históricos
├── docs/                   # este documento
├── backend/
│   ├── prisma/             # schema.prisma, migrations/, seed.ts, promote.ts, update-images.ts, cleanup-demo.ts
│   └── src/
│       ├── index.ts        # arranque: CORS, trust proxy, rutas, manejador global de errores
│       ├── config/         # checkout.ts (envío, sedes, bancos, datos de prueba), inventory.ts (umbral de stock bajo)
│       ├── controllers/    # lógica por recurso
│       ├── routes/         # una ruta por recurso, con su autenticación
│       ├── middleware/     # auth.middleware, requireRole, rateLimit, errorHandler
│       └── lib/            # prisma, payment (simulación bancaria), checkoutValidation, adminRules, asyncHandler, apiError
└── frontend/
    ├── public/products/    # fotos de producto + CREDITS.md (orígenes y licencias)
    └── src/
        ├── App.tsx         # rutas
        ├── config.ts       # STORE_NAME (nombre de la tienda, único lugar)
        ├── components/     # NavBar, Footer, ProductImage, RequireAuth, ProtectedRoute…
        │   ├── ui/         # Button, Card, Badge, Input, Select, Skeleton, Spinner, EmptyState, Toast
        │   └── checkout/   # pasos del checkout, resumen y pantalla de procesamiento
        ├── lib/            # api (fetch + manejo de sesión), auth, cart, guestCart, checkout, orderStatus, format
        └── pages/          # páginas públicas y de cliente; pages/admin/ para el panel
```

## 3. Cómo correrlo en local

```bash
npm install && npm install --prefix frontend && npm install --prefix backend
cp backend/.env.example backend/.env       # completa DATABASE_URL y JWT_SECRET
cp frontend/.env.example frontend/.env     # VITE_API_URL ya trae el valor local
npm run dev                                # backend en :4000, frontend en :5173
```

- Salud del backend: `GET http://localhost:4000/api/health`.
- **No ejecutes `npx prisma db seed` de nuevo:** el seed crea productos con `create` (duplicaría el catálogo) y la base ya tiene pedidos que los referencian. Para cambiar imágenes usa `update-images.ts`.
- Como la base es compartida con producción, **todo lo que pruebes en local afecta a producción** (usuarios, pedidos y stock). Usa cuentas de prueba con correo `…@example.com`.
- Comprobaciones: `npx tsc --noEmit` y `npm run build` en `backend/` y en `frontend/`.

## 4. Variables de entorno (solo nombres)

**Backend (`backend/.env`)**

| Variable | Para qué sirve |
|---|---|
| `DATABASE_URL` | Cadena de conexión a PostgreSQL (Neon). |
| `JWT_SECRET` | Secreto con el que se firman los tokens de sesión. Si cambia, todas las sesiones se invalidan. |
| `PORT` | Puerto del servidor (por defecto 4000; Render lo define solo). |
| `FRONTEND_URL` | Origen permitido por CORS. Vacío en local (usa `http://localhost:5173`); en Render debe ser la URL pública del frontend. |

**Frontend (`frontend/.env`)**

| Variable | Para qué sirve |
|---|---|
| `VITE_API_URL` | URL base de la API, **incluyendo `/api`** (por defecto `http://localhost:4000/api`). Se incrusta al compilar: cambiarla exige un nuevo despliegue. |

Las variables reales de producción viven solo en los paneles de Render y Vercel.

## 5. Modelo de datos (resumen)

Definido en `backend/prisma/schema.prisma`.

- **User**: `email` único, `passwordHash`, `role` (`customer` | `support` | `admin`), `active`, `createdAt`.
- **Product**: nombre, descripción, `price` (Decimal), marca, categoría, `specs` (JSON), `stock`, `imageUrl` (cadena; vacía = sin imagen, la tienda muestra un respaldo por categoría).
- **CartItem**: usuario + producto + cantidad (único por usuario y producto). El carrito de invitados vive en `localStorage` y se fusiona al iniciar sesión o registrarse.
- **Order**: usuario, `status` (`pending` | `paid` | `shipped` | `delivered`), `total` (= subtotal + envío), `trackingId` (`TRK-` + 8 caracteres), `createdAt`, `deliveryType` (`shipping` | `pickup`), `shippingAddress` (JSON), `pickupStore`, `shippingCost`. **No tiene `updatedAt`.**
- **OrderItem**: producto, cantidad y precio unitario (copiado del producto al comprar).
- **Payment**: uno por orden; `status` (`approved` | `pending`), `method`, `cardBrand`, `cardLast4`, `gatewayReference`, `amount`.
- **PaymentAttempt**: un registro por cada intento procesado por la pasarela simulada (aprobado o rechazado); `orderId` sin llave foránea porque un intento rechazado no tiene orden.

Pedidos anteriores al checkout actual tienen entrega y método de pago nulos: la interfaz muestra "—".

## 6. Roles y permisos

| Rol | Puede |
|---|---|
| Invitado | Ver catálogo y buscar, usar carrito local, rastrear pedidos por código, registrarse e iniciar sesión. |
| `customer` | Lo anterior + carrito en servidor, checkout, ver **solo sus** pedidos (los ajenos dan 404). |
| `support` | Lo de `customer` + ver pedidos de todos (con dirección de envío), cambiar su estado y consultar un usuario con sus pedidos. |
| `admin` | Lo de `support` + CRUD de productos, dashboard, gestión de usuarios (crear, cambiar rol, activar/desactivar, restablecer contraseña). No hay borrado de usuarios por diseño. |

Detalles de seguridad:
- El registro público **siempre** crea `customer` (se ignora cualquier `role` del body).
- El middleware de autenticación lee el **rol y el estado desde la base de datos en cada petición**, no del token: un cambio de rol o una desactivación aplica al instante. Cuenta inexistente o desactivada → `401`. En el login, una cuenta desactivada da `403` solo después de validar la contraseña.
- Un admin no puede cambiar su propio rol ni desactivarse, y nunca puede quedar el sistema sin un admin activo (regla `wouldLeaveNoActiveAdmin` en `lib/adminRules.ts`, aplicada en una transacción serializable).
- Si un `401` llega con sesión abierta, el frontend cierra la sesión y lleva a `/login` con un aviso.
- Para crear el primer admin (o recuperar acceso) está `backend/prisma/promote.ts`.

## 7. Endpoints

Base: `/api`. Los errores usan `{ "error": "..." }`; los handlers nuevos (rate limit, errores globales, seguimiento) añaden también `"message"` con el mismo texto. Un error no controlado responde `500` con "Ocurrió un error inesperado. Intenta de nuevo.".

**Públicos**
| Método y ruta | Descripción |
|---|---|
| `GET /health` | Estado del servicio. |
| `POST /auth/register` | `{ email, password (≥ 8) }` → `{ token }`. Crea siempre un cliente. |
| `POST /auth/login` | `{ email, password }` → `{ token }`. Límite: 10 intentos **fallidos** por 15 min por IP (`429`); los logins correctos no cuentan. |
| `GET /products` | Filtros opcionales: `category`, `brand`, `minPrice`, `maxPrice`, `search`, `take` (20 por defecto), `skip`. `search` ignora mayúsculas y tildes, busca en nombre, marca y descripción, y se ignora si tiene menos de 2 caracteres. |
| `GET /products/:id` | Detalle de un producto. |
| `GET /tracking/:trackingId` | Seguimiento público. Devuelve solo: `trackingId`, `status`, `createdAt`, `deliveryType`, `city` (nunca la dirección), `pickupStore` e `items` (nombre y cantidad). Límite: 30 por minuto por IP. `404` si no existe. |

**Cliente (requiere sesión)**
| Método y ruta | Descripción |
|---|---|
| `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:id`, `DELETE /cart/items/:id`, `POST /cart/merge` | Carrito en servidor; `merge` recibe el carrito de invitado al iniciar sesión. Añadir valida que el producto exista y tenga stock. |
| `GET /checkout/config` | Costo y regla de envío, sedes, bancos PSE y datos de prueba. |
| `POST /orders/checkout` | Crea el pedido (ver sección 8). |
| `GET /orders`, `GET /orders/:id` | Mis pedidos / detalle (con entrega, dirección o sede, envío y pago). |

**Soporte y admin**
| Método y ruta | Rol |
|---|---|
| `GET /orders`, `GET /orders/:id` (de todos los clientes) | `support`, `admin` |
| `PATCH /orders/:id/status` `{ status }` | `support`, `admin`. Si el pago estaba pendiente y el estado deja de ser `pending`, el `Payment` pasa a `approved`. |
| `GET /users/:id` | `support`, `admin` |
| `POST /products`, `PUT /products/:id`, `DELETE /products/:id` | `admin`. La imagen es opcional (vacío = sin imagen). No se puede borrar un producto con carritos o pedidos asociados (`400`). |
| `GET /admin/summary` | `admin`. Ventas totales y pedidos pendientes, número de pedidos y usuarios, productos con stock bajo (≤ 5, máximo 10), 5 más vendidos y ventas de los últimos 7 días (día de la zona `America/Bogota`). Solo cuentan pedidos `paid`, `shipped` y `delivered` como venta. |
| `GET /admin/users` (`search`, `role`, `page`), `POST /admin/users`, `PATCH /admin/users/:id` (`role`, `active`), `POST /admin/users/:id/reset-password` | `admin` |

Ninguna respuesta incluye `passwordHash`.

## 8. Checkout y pagos simulados

Flujo en el frontend (`/checkout`, ruta protegida): **1 Entrega → 2 Pago → 3 Confirmar**, con resumen lateral y un aviso "Pagos simulados". Un invitado va a `/login?next=/checkout` y vuelve; un carrito vacío redirige al catálogo. Si el pago se rechaza, se vuelve al paso 2 conservando lo escrito (excepto el CVV).

Reglas del servidor (`POST /orders/checkout`, `controllers/order.controller.ts`):
1. Valida entrada (`lib/checkoutValidation.ts`) → `400` con mensaje claro. **Cualquier valor monetario del body se ignora**: precios, envío y total los calcula el servidor.
2. Valida el stock de **todos** los ítems antes de intentar cualquier pago (`400`, sin crear nada ni registrar intentos).
3. Dentro de una transacción (15 s): descuenta stock con `updateMany` condicionado a `stock >= cantidad`, llama a `processPayment()` y crea orden, pago, ítems e intento aprobado; vacía el carrito.
4. Si el pago se rechaza, la transacción se revierte (sin orden ni cambio de stock), se registra un `PaymentAttempt` rechazado y se responde `402` con el motivo. El carrito queda intacto.
5. Pago contra entrega o en tienda (`cash`): no se llama a la pasarela; la orden queda `pending` con `Payment` `pending`, con stock descontado.

**Envío y recogida**: envío a domicilio cuesta **$15.000** y es **gratis desde $500.000** de subtotal; la recogida en tienda cuesta $0. Hay dos sedes ficticias de demostración: "Sede Popayán Centro" y "Sede Cartagena Bocagrande". El domicilio exige nombre, teléfono colombiano (10 dígitos que empiezan por 3), departamento, ciudad y dirección.

**Métodos y reglas** (`lib/payment.ts`, único punto de integración de pasarela; simula ~2 s de espera):

| Método | Datos | Resultado |
|---|---|---|
| Tarjeta | número (Luhn), vencimiento futuro, CVV de 3 dígitos | `4242 4242 4242 4242` (Visa) y `5555 5555 5555 4444` (Mastercard) aprueban. `4111 1111 1111 1111` aprueba solo hasta $1.000.000. `4000 0000 0000 0341` rechaza ("Fondos insuficientes"). `4000 0000 0000 0002` rechaza ("Tarjeta rechazada por el banco emisor"). Cualquier otra con Luhn válido aprueba. |
| PSE | banco, tipo de persona, tipo y número de documento | Aprueba salvo con "Banco de Prueba (rechaza)". |
| Nequi | celular y código de 6 dígitos | Aprueba salvo con el código `000000`. |
| Contra entrega / pago en tienda | — | Pedido pendiente de pago. |

Datos de prueba para tarjetas: vencimiento `12/34`, CVV `123`. Estos datos y reglas viven en `backend/src/config/checkout.ts`.

**Datos de pago**: solo se guardan marca y últimos 4 dígitos. El número completo y el CVV nunca se almacenan, loguean ni devuelven. Los controladores no registran `req.body`.

## 9. Sistema de diseño

- Tipografía Inter. Tokens en `frontend/tailwind.config.js`: azul de acento `#2563EB` (acciones generales), **naranja `cta` solo para acciones de compra** ("Añadir al carrito", "Ir a pagar", "Confirmar y pagar": base `#FB923C`, hover `#FDBA74`, pulsado `#F97316`, texto `#0F172A`, todos con contraste AA), verde `success` `#047857` solo para estados positivos, rojo para errores y acciones destructivas.
- El nombre de la tienda está en `frontend/src/config.ts` (`STORE_NAME`).
- Componentes reutilizables en `components/ui/`; `ProductImage` muestra un respaldo por categoría si falta la foto.
- Estados de pedido: los valores internos están en inglés (`pending`, `paid`, `shipped`, `delivered`) y las etiquetas en español salen de `frontend/src/lib/orderStatus.ts` (un único mapa).
- Páginas públicas: `/` (catálogo con búsqueda), `/product/:id`, `/cart`, `/login`, `/register`, `/seguimiento`, `/seguimiento/:trackingId`. Con sesión: `/checkout`, `/order/:id`, `/orders`. Panel (`support`/`admin`): `/panel` (Órdenes); solo `admin`: `/panel/products`, `/panel/users`, `/panel/dashboard`.

## 10. Scripts útiles (`backend/prisma/`)

Se ejecutan desde `backend/` con `npx ts-node prisma/<archivo>`. Todos usan la base de `DATABASE_URL` (la compartida).

| Script | Uso |
|---|---|
| `promote.ts` | `promote.ts correo@ejemplo.com admin\|support`: cambia el rol de un usuario. Vía de emergencia; lo normal es hacerlo desde el panel. |
| `update-images.ts` | Actualiza `imageUrl` por nombre de producto (idempotente). Las fotos están en `frontend/public/products/` y sus créditos en `CREDITS.md`. |
| `cleanup-demo.ts` | Limpieza de usuarios y pedidos de prueba. **Por defecto es un dry run que solo lista.** `--execute` borra (con respaldo JSON previo en el Escritorio) y `--restock` devuelve el stock. Lee el encabezado del archivo antes de usarlo. |
| `seed.ts` | Carga inicial del catálogo. No volver a ejecutar (ver sección 3). |

## 11. Migraciones aplicadas

1. `20260821025850_init`: tablas iniciales.
2. `20261016134415_add_user_active`: columna `User.active`.
3. `20261016140218_add_checkout_fields`: enum `DeliveryType`, campos de entrega en `Order`, campos de método y tarjeta en `Payment` y tabla `PaymentAttempt`.

Las migraciones **no se aplican solas al desplegar** (el build de Render solo compila). Se aplican con `npx prisma migrate deploy` desde un equipo con acceso a la base. Como la base es compartida, una migración aplicada afecta a producción de inmediato: hazlas siempre aditivas.

## 12. Despliegue

- **Frontend en Vercel**: sitio estático de Vite. Requiere `VITE_API_URL` apuntando al backend (con `/api`).
- **Backend en Render** (Web Service): ejecuta `npm run build` (`tsc`) y `npm start` (`node dist/index.js`). `postinstall` genera el cliente de Prisma. Requiere `DATABASE_URL`, `JWT_SECRET` y `FRONTEND_URL`.
- El backend usa `trust proxy` (un salto) para que el límite por IP funcione detrás del proxy de Render.
- **Arranque en frío:** en el plan gratuito, Render duerme el servicio tras un tiempo sin tráfico y la primera petición puede tardar decenas de segundos. Neon también suspende la base: la primera consulta o migración puede dar un timeout (por ejemplo `P1002`); reintentar suele bastar. Para migraciones conviene la conexión directa de Neon (sin `-pooler`).
- Un push a `main` despliega a producción.

## 13. Limitaciones conocidas y pendientes

- **No hay pasarela de pago real.** Todo es simulado.
- **`GET /api/checkout/config` expone a propósito los datos de prueba** (números de tarjeta, CVV, reglas). Debe quitarse esa parte al integrar una pasarela real.
- **Revertir un pedido a `pending` no revierte el pago:** si un `Payment` ya estaba `approved`, se queda así.
- **`Order` no tiene `updatedAt`:** el seguimiento público no puede mostrar la fecha de última actualización. Agregarla requiere una migración (aditiva).
- No hay cancelación ni reembolso de pedidos, cupones, direcciones o tarjetas guardadas, correos o notificaciones, recuperación de contraseña por correo ni doble factor. El admin restablece contraseñas a mano.
- Los tokens JWT duran 7 días y no se pueden revocar individualmente (aunque una cuenta desactivada se bloquea al instante, por la consulta a la BD).
- Los límites de peticiones se guardan en memoria: se reinician al reiniciar el backend y no se comparten entre varias instancias.
- La base de datos es única para local y producción. Hay datos de demo mezclados con datos reales: usar `cleanup-demo.ts` (dry run primero). Cuentas de prueba antiguas (`sprint3-*`, `sprint4-*` con dominio `@test.com`) **no** las cubre la regla del script.
- El umbral de "Últimas unidades" es 5 en el backend (`config/inventory.ts`, lo recibe el dashboard), pero el catálogo y el detalle de producto tienen la misma constante escrita en el frontend.
- Las especificaciones de producto se muestran con el nombre guardado en los datos (por ejemplo "Bateria" sin tilde). Varias fotos de producto son de un modelo referencial (ver `CREDITS.md`).
- La búsqueda por texto recorre la tabla de productos (sin índice): es suficiente para un catálogo pequeño.
- El `README.md` de la raíz es de los primeros sprints: habla de 6 tablas (hoy son 7), de filtros de texto libre y no menciona varios scripts. Este documento es la referencia actual.
