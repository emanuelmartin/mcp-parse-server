# MCP Parse Server

Servidor MCP (Model Context Protocol) completo para Parse Server con funcionalidades de CRUD, gestión de schemas, roles, ACL y Cloud Functions.

## 🚀 Características

### 📖 Lectura de Datos
- `parse_get_object` - Obtener objeto por ID
- `parse_query` - Consultar con filtros, ordenamiento y paginación
- `parse_count` - Contar objetos con filtros
- `parse_aggregate` - Queries de agregación (MongoDB pipeline)

### ✍️ Escritura de Datos
- `parse_create_object` - Crear nuevos objetos
- `parse_update_object` - Actualizar objetos existentes
- `parse_delete_object` - Eliminar objetos
- `parse_batch` - Operaciones batch (múltiples operaciones)
- `parse_increment_field` - Incrementar campos numéricos
- `parse_add_to_array` - Añadir elementos a arrays
- `parse_remove_from_array` - Remover elementos de arrays

### 🗂️ Gestión de Schemas
- `parse_get_schemas` - Listar todos los schemas
- `parse_get_schema` - Obtener schema de una clase
- `parse_create_class` - Crear nueva clase con schema
- `parse_update_schema` - Actualizar schema de clase
- `parse_delete_class` - Eliminar clase
- `parse_add_field` - Añadir campo a clase
- `parse_delete_field` - Eliminar campo de clase

### 🔐 Seguridad (Roles, Users, ACL)
- `parse_create_role` - Crear rol
- `parse_get_role` - Obtener rol
- `parse_list_roles` - Listar roles
- `parse_update_role` - Actualizar rol
- `parse_delete_role` - Eliminar rol
- `parse_add_users_to_role` - Añadir usuarios a rol
- `parse_remove_users_from_role` - Remover usuarios de rol
- `parse_update_clp` - Actualizar Class Level Permissions
- `parse_create_user` - Crear usuario
- `parse_get_user` - Obtener usuario
- `parse_list_users` - Listar usuarios

### ☁️ Cloud Functions
- `parse_call_cloud_function` - Llamar Cloud Function
- `parse_run_job` - Ejecutar Background Job
- `parse_get_cloud_code_info` - Información de Cloud Code

## 📦 Instalación

Requiere pnpm 11 (`corepack enable`); `npm install` queda bloqueado por el `preinstall`.

```bash
pnpm install --frozen-lockfile
```

## ⚙️ Configuración

Crea un archivo `.env` en la raíz del proyecto:

```env
PARSE_URL=https://tu-parse-server.com/parse
PARSE_APP_ID=tu-app-id
PARSE_REST_KEY=tu-rest-key
PARSE_MASTER_KEY=tu-master-key

# Opcional: Permite certificados autofirmados (solo desarrollo)
ALLOW_SELF_SIGNED_CERT=true
# O alternativamente:
# NODE_TLS_REJECT_UNAUTHORIZED=0
```

**Notas importantes:**
- `PARSE_MASTER_KEY` es opcional pero necesario para operaciones de schema, roles y algunas operaciones administrativas.
- `ALLOW_SELF_SIGNED_CERT=true` permite certificados SSL autofirmados. **⚠️ Solo usar en desarrollo local, nunca en producción.**

## 🏃 Uso

### Iniciar el servidor

```bash
pnpm start
```

### Modo desarrollo (con watch)

```bash
pnpm dev
```

## 📁 Estructura del Proyecto

```
mcp-parse-server/
├── index.mjs                 # Punto de entrada principal
├── src/
│   ├── utils/
│   │   ├── config.js         # Configuración y variables de entorno
│   │   └── parse-client.js   # Cliente HTTP para Parse REST API
│   └── tools/
│       ├── read.js           # Herramientas de lectura
│       ├── write.js          # Herramientas de escritura
│       ├── schema.js         # Herramientas de schema
│       ├── security.js       # Herramientas de roles y ACL
│       └── cloud.js          # Herramientas de Cloud Functions
├── package.json
├── .env
└── README.md
```

## 🔧 Configuración en Claude Desktop / VS Code

Añade esta configuración a tu archivo de configuración MCP:

**Para Claude Desktop (`claude_desktop_config.json`):**

```json
{
  "mcpServers": {
    "parse-server": {
      "command": "node",
      "args": ["/ruta/absoluta/a/mcp-parse-server/index.mjs"],
      "env": {
        "PARSE_URL": "https://tu-parse-server.com/parse",
        "PARSE_APP_ID": "tu-app-id",
        "PARSE_REST_KEY": "tu-rest-key",
        "PARSE_MASTER_KEY": "tu-master-key",
        "ALLOW_SELF_SIGNED_CERT": "true"
      }
    }
  }
}
```

**Para VS Code:**

Configura en tu `settings.json` del workspace o global.

## 📚 Ejemplos de Uso

### Crear una clase con schema

```javascript
{
  "className": "Product",
  "fields": {
    "name": {
      "type": "String",
      "required": true
    },
    "price": {
      "type": "Number",
      "required": true
    },
    "category": {
      "type": "Pointer",
      "targetClass": "Category"
    },
    "tags": {
      "type": "Array"
    }
  }
}
```

### Query con filtros

```javascript
{
  "className": "Product",
  "where": {
    "price": { "$gte": 10, "$lte": 100 },
    "category": {
      "__type": "Pointer",
      "className": "Category",
      "objectId": "abc123"
    }
  },
  "order": "-createdAt",
  "limit": 20,
  "include": "category"
}
```

### Crear rol con usuarios

```javascript
{
  "name": "Moderator",
  "users": ["userId1", "userId2"],
  "ACL": {
    "*": { "read": true },
    "role:Admin": { "write": true }
  }
}
```

### Actualizar CLP

```javascript
{
  "className": "Product",
  "permissions": {
    "get": { "*": true },
    "find": { "*": true },
    "create": { "requiresAuthentication": true },
    "update": { "role:Admin": true },
    "delete": { "role:Admin": true }
  }
}
```

## 🛡️ Permisos

Algunas operaciones requieren la **Master Key**:
- Operaciones de schema (crear/modificar/eliminar clases)
- Gestión de roles
- Operaciones administrativas
- Background Jobs
- Queries de agregación

Asegúrate de configurar `PARSE_MASTER_KEY` en tu `.env` para estas operaciones.

## 📝 Licencia

MIT

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor abre un issue o pull request.

## Cambio de npm a pnpm (una sola vez, después de bajar el cambio)

Este repo usa **pnpm** (`packageManager` en `package.json`). Si ya tenías el repo instalado con npm, corre una vez:

```bash
bash scripts/pnpm-setup.sh          # o: npm run setup:pnpm   (--dry-run para ver qué hará)
```

Instala pnpm de la versión del repo (con Volta o Corepack; usa Node 22 si tu Node es menor a 22.13), borra los
`node_modules` que armó npm en las partes que ahora son pnpm y reinstala con `pnpm install --frozen-lockfile`.
Las carpetas que siguen con npm (las que se instalan en servidores, con `package-lock.json`) no se tocan.
Después: `pnpm install` y `pnpm run <script>`; `npm install` queda bloqueado. Un worktree nuevo sólo necesita `pnpm install`
(pnpm reutiliza su store global, no vuelve a descargar paquetes).
