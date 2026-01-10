import { z } from 'zod';
import { parseRequest } from '../utils/parse-client.js';

// Helper para valores JSON primitivos
const jsonPrimitive = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.literal(null),
]);

/**
 * Registra herramientas de escritura en el servidor MCP
 */
export function registerWriteTools(server) {
  // Tool: Crear objeto
  server.tool(
    'parse_create_object',
    'Crea un nuevo objeto (registro) en una clase de Parse Server. Proporciona className y un objeto data con los campos y valores. Retorna el objectId del objeto creado.',

    {
      inputSchema: z.object({
        className: z
          .string()
          .describe('Nombre de la clase, por ejemplo "PatientRecord"'),
        data: z
          .record(z.string(), z.unknown())
          .describe('Datos del objeto a crear (JSON)'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { className, data } = params;

      // Convierte automáticamente los campos que parecen relaciones
      function normalizeRelations(obj) {
        if (Array.isArray(obj)) {
          // Array de relaciones (Relation)
          if (obj.length && obj.every(e => e && typeof e === 'object' && e.className && e.objectId)) {
            return {
              __op: 'AddRelation',
              objects: obj.map(e => ({
                __type: 'Pointer',
                className: e.className,
                objectId: e.objectId,
              })),
            };
          }
          return obj.map(normalizeRelations);
        } else if (obj && typeof obj === 'object' && obj.className && obj.objectId) {
          // Pointer
          return {
            __type: 'Pointer',
            className: obj.className,
            objectId: obj.objectId,
          };
        } else if (obj && typeof obj === 'object') {
          // Recorre recursivamente
          const out = {};
          for (const k in obj) out[k] = normalizeRelations(obj[k]);
          return out;
        }
        return obj;
      }

      const normalizedData = normalizeRelations(data);
      const result = await parseRequest(`/classes/${className}`, {
        method: 'POST',
        body: JSON.stringify(normalizedData),
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

  // Tool: Actualizar objeto
  server.tool(
    'parse_update_object',
    'Actualiza campos de un objeto existente en Parse Server. Requiere className, objectId y un objeto data con los campos a modificar. Solo actualiza los campos especificados.',

    {
      inputSchema: z.object({
        className: z
          .string()
          .describe('Nombre de la clase'),
        objectId: z.string().describe('objectId del registro a actualizar'),
        data: z
          .record(z.string(), z.unknown())
          .describe('Datos a actualizar (JSON)'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { className, objectId, data } = params;

      // Convierte automáticamente los campos que parecen relaciones
      function normalizeRelations(obj) {
        if (Array.isArray(obj)) {
          // Array de relaciones (Relation)
          if (obj.length && obj.every(e => e && typeof e === 'object' && e.className && e.objectId)) {
            return {
              __op: 'AddRelation',
              objects: obj.map(e => ({
                __type: 'Pointer',
                className: e.className,
                objectId: e.objectId,
              })),
            };
          }
          return obj.map(normalizeRelations);
        } else if (obj && typeof obj === 'object' && obj.className && obj.objectId) {
          // Pointer
          return {
            __type: 'Pointer',
            className: obj.className,
            objectId: obj.objectId,
          };
        } else if (obj && typeof obj === 'object') {
          // Recorre recursivamente
          const out = {};
          for (const k in obj) out[k] = normalizeRelations(obj[k]);
          return out;
        }
        return obj;
      }

      const normalizedData = normalizeRelations(data);
      const result = await parseRequest(`/classes/${className}/${objectId}`, {
        method: 'PUT',
        body: JSON.stringify(normalizedData),
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

  // Tool: Eliminar objeto
  server.tool(
    'parse_delete_object',
    'Elimina permanentemente un objeto de Parse Server. Requiere className y objectId del objeto a eliminar.',

    {
      inputSchema: z.object({
        className: z
          .string()
          .describe('Nombre de la clase'),
        objectId: z.string().describe('objectId del registro a eliminar'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { className, objectId } = params;

      const result = await parseRequest(`/classes/${className}/${objectId}`, {
        method: 'DELETE',
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

  // Tool: Batch operations
  server.tool(
    'parse_batch',
    'Ejecuta múltiples operaciones (POST/crear, PUT/actualizar, DELETE/eliminar) en una sola llamada. Útil para operaciones masivas. Cada request tiene method, path y body opcional.',

    {
      inputSchema: z.object({
        requests: z
          .array(
            z.object({
              method: z.enum(['POST', 'PUT', 'DELETE']).describe('Método HTTP'),
              path: z.string().describe('Ruta relativa (ej: /classes/MyClass/objectId)'),
              body: z.record(z.string(), z.unknown()).optional().describe('Datos para POST/PUT'),
            })
          )
          .describe('Array de operaciones a ejecutar'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { requests } = params;

      const result = await parseRequest('/batch', {
        method: 'POST',
        body: JSON.stringify({ requests }),
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

  // Tool: Increment field
  server.tool(
    'parse_increment_field',
    'Incrementa (o decrementa con valor negativo) un campo numérico de forma atómica. Útil para contadores, puntuaciones, etc. El amount por defecto es 1.',

    {
      inputSchema: z.object({
        className: z.string().describe('Nombre de la clase'),
        objectId: z.string().describe('objectId del registro'),
        fieldName: z.string().describe('Nombre del campo a incrementar'),
        amount: z.number().optional().default(1).describe('Cantidad a incrementar (default: 1)'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { className, objectId, fieldName, amount } = params;

      const data = {
        [fieldName]: {
          __op: 'Increment',
          amount: amount,
        },
      };

      const result = await parseRequest(`/classes/${className}/${objectId}`, {
        method: 'PUT',
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

  // Tool: Add to array
  server.tool(
    'parse_add_to_array',
    'Añade elementos a un campo array de forma atómica. Si unique=true, usa AddUnique para evitar duplicados. Solo acepta valores primitivos (string, number, boolean, null).',

    {
      inputSchema: z.object({
        className: z.string().describe('Nombre de la clase'),
        objectId: z.string().describe('objectId del registro'),
        fieldName: z.string().describe('Nombre del campo array'),
        values: z
          .array(jsonPrimitive)
          .min(1)
          .describe('Valores primitivos a añadir (string, number, boolean o null)'),
        unique: z
          .boolean()
          .optional()
          .default(false)
          .describe('Si true, usa AddUnique'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { className, objectId, fieldName, values, unique } = params;

      const data = {
        [fieldName]: {
          __op: unique ? 'AddUnique' : 'Add',
          objects: values,
        },
      };

      const result = await parseRequest(`/classes/${className}/${objectId}`, {
        method: 'PUT',
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

  // Tool: Remove from array
  server.tool(
    'parse_remove_from_array',
    'Elimina elementos específicos de un campo array de forma atómica. Solo acepta valores primitivos (string, number, boolean, null).',

    {
      inputSchema: z.object({
        className: z.string().describe('Nombre de la clase'),
        objectId: z.string().describe('objectId del registro'),
        fieldName: z.string().describe('Nombre del campo array'),
        values: z
          .array(jsonPrimitive)
          .min(1)
          .describe('Valores primitivos a eliminar (string, number, boolean o null)'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { className, objectId, fieldName, values } = params;

      const data = {
        [fieldName]: {
          __op: 'Remove',
          objects: values,
        },
      };

      const result = await parseRequest(`/classes/${className}/${objectId}`, {
        method: 'PUT',
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
}
