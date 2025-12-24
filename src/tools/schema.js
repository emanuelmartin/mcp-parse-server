import { z } from 'zod';
import { parseRequest } from '../utils/parse-client.js';

/**
 * Registra herramientas de schema en el servidor MCP
 */
export function registerSchemaTools(server) {
  // Tool: Obtener todos los schemas
  server.tool(
    'parse_get_schemas',
    'Lista todos los schemas (estructuras de clases) disponibles en Parse Server. Muestra nombres de clases, campos, tipos y permisos. Requiere master key.',

    {
      inputSchema: z.object({}),
    },
    async () => {
      const data = await parseRequest('/schemas', {}, true);

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

  // Tool: Obtener schema de una clase específica
  server.tool(
    'parse_get_schema',
    'Obtiene el schema completo de una clase específica: sus campos, tipos de datos, relaciones y permisos (CLP). Requiere master key.',

    {
      inputSchema: z.object({
        className: z.string().describe('Nombre de la clase'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { className } = params;

      const data = await parseRequest(`/schemas/${className}`, {}, true);

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

  // Tool: Crear una nueva clase con schema
  server.tool(
    'parse_create_class',
    'Crea una nueva clase (tabla) en Parse Server con su estructura de campos. Define className, fields (nombre: {type, targetClass, required, defaultValue}) y opcionalmente classLevelPermissions. Requiere master key.',

    {
      inputSchema: z.object({
        className: z.string().describe('Nombre de la clase a crear'),
        fields: z
          .record(
            z.string(),
            z.object({
              type: z.string().describe('Tipo de campo (String, Number, Boolean, Date, File, GeoPoint, Pointer, Relation, Array, Object)'),
              targetClass: z.string().optional().describe('Clase objetivo para Pointer o Relation'),
              required: z.boolean().optional().describe('Si el campo es requerido'),
              defaultValue: z.unknown().optional().describe('Valor por defecto'),
            })
          )
          .describe('Campos del schema'),
        classLevelPermissions: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Permisos a nivel de clase (CLP)'),
      }),
    },
    async (input) => {
      // Manejar si viene envuelto en inputSchema
      const params = input.inputSchema || input;
      const { className, fields, classLevelPermissions } = params;

      if (!className) {
        throw new Error('className is required but was not provided');
      }

      // Interpreta correctamente los campos Relation y Pointer
      const parsedFields = {};
      if (fields) {
        for (const [key, def] of Object.entries(fields)) {
          if (def.type === 'Relation' || def.type === 'Pointer') {
            parsedFields[key] = {
              type: def.type,
              targetClass: def.targetClass,
              ...(def.required !== undefined ? { required: def.required } : {}),
              ...(def.defaultValue !== undefined ? { defaultValue: def.defaultValue } : {}),
            };
          } else {
            parsedFields[key] = def;
          }
        }
      }

      const payload = {
        className,
        fields: parsedFields,
      };
      if (classLevelPermissions) {
        payload.classLevelPermissions = classLevelPermissions;
      }

      const data = await parseRequest('/schemas', {
        method: 'POST',
        body: JSON.stringify(payload),
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

  // Tool: Actualizar schema de una clase
  server.tool(
    'parse_update_schema',
    'Modifica el schema de una clase existente: añade nuevos campos o actualiza Class Level Permissions (CLP). No puede eliminar campos (usa parse_delete_field). Requiere master key.',

    {
      inputSchema: z.object({
        className: z.string().describe('Nombre de la clase'),
        fields: z
          .record(
            z.string(),
            z.object({
              type: z.string().describe('Tipo de campo'),
              targetClass: z.string().optional().describe('Clase objetivo para Pointer o Relation'),
              required: z.boolean().optional().describe('Si el campo es requerido'),
              defaultValue: z.unknown().optional().describe('Valor por defecto'),
            })
          )
          .optional()
          .describe('Campos a añadir o modificar'),
        classLevelPermissions: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Permisos a nivel de clase (CLP)'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { className, fields, classLevelPermissions } = params;

      const schema = {};
      if (fields) {
        const parsedFields = {};
        for (const [key, def] of Object.entries(fields)) {
          if (def.type === 'Relation' || def.type === 'Pointer') {
            parsedFields[key] = {
              type: def.type,
              targetClass: def.targetClass,
              ...(def.required !== undefined ? { required: def.required } : {}),
              ...(def.defaultValue !== undefined ? { defaultValue: def.defaultValue } : {}),
            };
          } else {
            parsedFields[key] = def;
          }
        }
        schema.fields = parsedFields;
      }
      if (classLevelPermissions) {
        schema.classLevelPermissions = classLevelPermissions;
      }

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

  // Tool: Eliminar una clase
  server.tool(
    'parse_delete_class',
    'Elimina permanentemente una clase y TODOS sus objetos de Parse Server. Esta operación es irreversible. Requiere master key.',

    {
      inputSchema: z.object({
        className: z.string().describe('Nombre de la clase a eliminar'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { className } = params;

      const data = await parseRequest(`/schemas/${className}`, {
        method: 'DELETE',
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

  // Tool: Añadir campo a una clase
  server.tool(
    'parse_add_field',
    'Añade un nuevo campo a una clase existente. Especifica fieldName, fieldType (String, Number, Boolean, Date, Pointer, etc), y opcionalmente targetClass, required, defaultValue. Requiere master key.',

    {
      inputSchema: z.object({
        className: z.string().describe('Nombre de la clase'),
        fieldName: z.string().describe('Nombre del campo a añadir'),
        fieldType: z.string().describe('Tipo de campo (String, Number, Boolean, Date, File, GeoPoint, Pointer, Relation, Array, Object)'),
        targetClass: z.string().optional().describe('Clase objetivo para Pointer o Relation'),
        required: z.boolean().optional().describe('Si el campo es requerido'),
        defaultValue: z.unknown().optional().describe('Valor por defecto'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { className, fieldName, fieldType, targetClass, required, defaultValue } = params;

      const fieldDef = {
        type: fieldType,
      };

      if (targetClass) fieldDef.targetClass = targetClass;
      if (required !== undefined) fieldDef.required = required;
      if (defaultValue !== undefined) fieldDef.defaultValue = defaultValue;

      const schema = {
        fields: {
          [fieldName]: fieldDef,
        },
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

  // Tool: Eliminar campo de una clase
  server.tool(
    'parse_delete_field',
    'Elimina permanentemente un campo de una clase. Los datos de ese campo en todos los objetos se perderán. Requiere master key.',

    {
      inputSchema: z.object({
        className: z.string().describe('Nombre de la clase'),
        fieldName: z.string().describe('Nombre del campo a eliminar'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { className, fieldName } = params;

      const schema = {
        fields: {
          [fieldName]: {
            __op: 'Delete',
          },
        },
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
}
