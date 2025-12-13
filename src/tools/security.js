import { z } from 'zod';
import { parseRequest } from '../utils/parse-client.js';

/**
 * Registra herramientas de seguridad (Roles, Users, ACL) en el servidor MCP
 */
export function registerSecurityTools(server) {
  // Tool: Crear un rol
  server.tool(
    'parse_create_role',
    'Crea un nuevo rol en Parse Server para control de acceso. El campo ACL es OBLIGATORIO y debe ser un objeto que defina los permisos de lectura y escritura para usuarios, roles o público. Ejemplo de input: { "name": "Administrador", "ACL": { "*": { "read": true }, "role:Admin": { "read": true, "write": true } } }. Opcionalmente puedes agregar arrays de userIds y roleIds. Requiere master key.',

    {
      inputSchema: z.object({
        name: z.string().describe('Nombre del rol'),
        ACL: z
          .record(z.string(), z.unknown())
          .describe('Access Control List del rol (obligatorio)'),
        users: z
          .array(z.string())
          .optional()
          .describe('Array de objectIds de usuarios'),
        roles: z
          .array(z.string())
          .optional()
          .describe('Array de objectIds de roles heredados'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { name, ACL, users, roles } = params;

      const data = {
        name,
      };

      if (ACL) data.ACL = ACL;

      if (users) {
        data.users = {
          __op: 'AddRelation',
          objects: users.map(id => ({
            __type: 'Pointer',
            className: '_User',
            objectId: id,
          })),
        };
      }

      if (roles) {
        data.roles = {
          __op: 'AddRelation',
          objects: roles.map(id => ({
            __type: 'Pointer',
            className: '_Role',
            objectId: id,
          })),
        };
      }

      const result = await parseRequest('/roles', {
        method: 'POST',
        body: JSON.stringify(data),
      }, true);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // Tool: Obtener un rol
  server.tool(
    'parse_get_role',
    'Obtiene los detalles de un rol específico por su objectId: nombre, ACL, y relaciones con usuarios. Requiere master key.',

    {
      inputSchema: z.object({
        objectId: z.string().describe('objectId del rol'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { objectId } = params;

      const data = await parseRequest(`/roles/${objectId}`, {}, true);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }
  );

  // Tool: Listar roles
  server.tool(
    'parse_list_roles',
    'Lista todos los roles en Parse Server. Opcionalmente filtra con where (ej: {"name": "Admin"}) y limita resultados. Requiere master key.',

    {
      inputSchema: z.object({
        where: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Filtros (ej: {"name": "Admin"}'),
        limit: z.number().optional().describe('Límite de resultados'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { where, limit } = params;

      const urlParams = new URLSearchParams();
      if (where) urlParams.set('where', JSON.stringify(where));
      if (limit) urlParams.set('limit', String(limit));

      const data = await parseRequest(`/roles?${urlParams.toString()}`, {}, true);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }
  );

  // Tool: Actualizar un rol
  server.tool(
    'parse_update_role',
    'Modifica el nombre o ACL de un rol existente. Para gestionar usuarios del rol usa parse_add_users_to_role o parse_remove_users_from_role. Requiere master key.',

    {
      inputSchema: z.object({
        objectId: z.string().describe('objectId del rol'),
        name: z.string().optional().describe('Nuevo nombre del rol'),
        ACL: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Nuevo ACL'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { objectId, name, ACL } = params;

      const data = {};
      if (name) data.name = name;
      if (ACL) data.ACL = ACL;

      const result = await parseRequest(`/roles/${objectId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }, true);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // Tool: Eliminar un rol
  server.tool(
    'parse_delete_role',
    'Elimina permanentemente un rol de Parse Server. Los usuarios que tenían este rol perderán sus permisos asociados. Requiere master key.',

    {
      inputSchema: z.object({
        objectId: z.string().describe('objectId del rol a eliminar'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { objectId } = params;

      const result = await parseRequest(`/roles/${objectId}`, {
        method: 'DELETE',
      }, true);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // Tool: Añadir usuarios a un rol
  server.tool(
    'parse_add_users_to_role',
    'Añade uno o más usuarios a un rol existente mediante sus objectIds. Los usuarios heredarán los permisos del rol. Requiere master key.',

    {
      inputSchema: z.object({
        roleId: z.string().describe('objectId del rol'),
        userIds: z.array(z.string()).describe('Array de objectIds de usuarios'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { roleId, userIds } = params;

      const data = {
        users: {
          __op: 'AddRelation',
          objects: userIds.map(id => ({
            __type: 'Pointer',
            className: '_User',
            objectId: id,
          })),
        },
      };

      const result = await parseRequest(`/roles/${roleId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }, true);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // Tool: Remover usuarios de un rol
  server.tool(
    'parse_remove_users_from_role',
    'Remueve uno o más usuarios de un rol mediante sus objectIds. Los usuarios perderán los permisos asociados a ese rol. Requiere master key.',

    {
      inputSchema: z.object({
        roleId: z.string().describe('objectId del rol'),
        userIds: z.array(z.string()).describe('Array de objectIds de usuarios'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { roleId, userIds } = params;

      const data = {
        users: {
          __op: 'RemoveRelation',
          objects: userIds.map(id => ({
            __type: 'Pointer',
            className: '_User',
            objectId: id,
          })),
        },
      };

      const result = await parseRequest(`/roles/${roleId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }, true);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // Tool: Actualizar CLP (Class Level Permissions)
  server.tool(
    'parse_update_clp',
    'Define permisos a nivel de clase (quién puede get, find, create, update, delete, addField). Usa "*" para público, "requiresAuthentication" para usuarios autenticados, o "role:RoleName" para roles específicos. Requiere master key.',

    {
      inputSchema: z.object({
        className: z.string().describe('Nombre de la clase'),
        permissions: z
          .object({
            get: z.record(z.boolean()).optional(),
            find: z.record(z.boolean()).optional(),
            create: z.record(z.boolean()).optional(),
            update: z.record(z.boolean()).optional(),
            delete: z.record(z.boolean()).optional(),
            addField: z.record(z.boolean()).optional(),
          })
          .describe('Objeto de permisos, ej: {"get": {"*": true}, "find": {"requiresAuthentication": true}}'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { className, permissions } = params;

      const schema = {
        classLevelPermissions: permissions,
      };

      const data = await parseRequest(`/schemas/${className}`, {
        method: 'PUT',
        body: JSON.stringify(schema),
      }, true);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }
  );

  // Tool: Crear usuario
  server.tool(
    'parse_create_user',
    'Crea un nuevo usuario en Parse Server. Requiere username y password obligatorios. Opcionalmente email y campos adicionales (additionalFields). Retorna sessionToken para autenticación.',

    {
      inputSchema: z.object({
        username: z.string().describe('Nombre de usuario'),
        password: z.string().describe('Contraseña'),
        email: z.string().optional().describe('Email del usuario'),
        additionalFields: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Campos adicionales del usuario'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { username, password, email, additionalFields } = params;

      const data = {
        username,
        password,
        ...additionalFields,
      };

      if (email) data.email = email;

      const result = await parseRequest('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // Tool: Obtener usuario
  server.tool(
    'parse_get_user',
    'Obtiene los detalles de un usuario específico por su objectId. Muestra username, email y campos personalizados (pero no password). Requiere master key.',

    {
      inputSchema: z.object({
        objectId: z.string().describe('objectId del usuario'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { objectId } = params;

      const data = await parseRequest(`/users/${objectId}`, {}, true);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }
  );

  // Tool: Listar usuarios
  server.tool(
    'parse_list_users',
    'Lista todos los usuarios en Parse Server. Opcionalmente filtra con where (ej: {"username": "admin"}) y limita resultados. Requiere master key.',

    {
      inputSchema: z.object({
        where: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Filtros (ej: {"username": "admin"}'),
        limit: z.number().optional().describe('Límite de resultados'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { where, limit } = params;

      const urlParams = new URLSearchParams();
      if (where) urlParams.set('where', JSON.stringify(where));
      if (limit) urlParams.set('limit', String(limit));

      const data = await parseRequest(`/users?${urlParams.toString()}`, {}, true);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }
  );
}
