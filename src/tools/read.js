import { z } from 'zod';
import { parseRequest } from '../utils/parse-client.js';

/**
 * Registra herramientas de lectura en el servidor MCP
 */
export function registerReadTools(server) {
  // Tool: Obtener objeto por ID
  server.tool(
    'parse_get_object',
    'Obtiene un objeto específico de Parse Server por su className y objectId. Útil para recuperar un registro individual cuando conoces su ID.',

    {
      inputSchema: z.object({
        className: z
          .string()
          .describe('Nombre de la clase de Parse, por ejemplo "PatientRecord"'),
        objectId: z.string().describe('objectId del registro'),
        include: z
          .string()
          .optional()
          .describe('Campos de tipo Pointer a incluir (ej: "user,category")'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { className, objectId, include } = params;

      const urlParams = new URLSearchParams();
      if (include) urlParams.set('include', include);

      const path = `/classes/${className}/${objectId}${
        urlParams.toString() ? `?${urlParams.toString()}` : ''
      }`;
      const data = await parseRequest(path);

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

  // Tool: Query con where, order, limit, skip
  server.tool(
    'parse_query',
    'Consulta múltiples objetos de una clase en Parse Server. Soporta filtros con where (JSON), ordenamiento, paginación (limit/skip), selección de campos (keys) e inclusión de relaciones (include). El where usa sintaxis de Parse Query: {"field": "value"} para igualdad, {"field": {"$gt": 10}} para comparaciones, etc.',

    {
      inputSchema: z.object({
        className: z
          .string()
          .describe('Nombre de la clase, por ejemplo "PatientRecord"'),
        where: z
          .record(z.string(), z.unknown())
          .optional()
          .describe(
            'Objeto where de Parse, por ejemplo { "isActive": true } o { "patientId": "..." }'
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .optional()
          .describe('Límite de registros (1-1000)'),
        skip: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe('Número de registros a saltar para paginación'),
        order: z
          .string()
          .optional()
          .describe('Campo para ordenar (ej: "createdAt" o "-createdAt" para descendente)'),
        keys: z
          .string()
          .optional()
          .describe('Campos a retornar separados por coma (ej: "name,email")'),
        include: z
          .string()
          .optional()
          .describe('Campos de tipo Pointer a incluir (ej: "user,category")'),
        count: z
          .boolean()
          .optional()
          .describe('Si true, incluye el conteo total de resultados'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { className, where, limit, skip, order, keys, include, count } = params;

      const queryParams = new URLSearchParams();
      if (where) queryParams.set('where', JSON.stringify(where));
      if (limit) queryParams.set('limit', String(limit));
      if (skip) queryParams.set('skip', String(skip));
      if (order) queryParams.set('order', order);
      if (keys) queryParams.set('keys', keys);
      if (include) queryParams.set('include', include);
      if (count) queryParams.set('count', '1');

      const data = await parseRequest(`/classes/${className}?${queryParams.toString()}`);

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

  server.tool(
    'parse_get_relation',
    'Obtiene los objetos relacionados de un campo Relation en Parse Server. Proporciona className, objectId y relationField. Retorna el array de objetos relacionados.',
    {
      inputSchema: z.object({
        className: z.string().describe('Clase principal, ej: _Role'),
        objectId: z.string().describe('ID del objeto principal'),
        relationField: z.string().describe('Campo de relación, ej: permissions'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { className, objectId, relationField } = params;
      // Usar include para traer los objetos relacionados
      const path = `/classes/${className}/${objectId}?include=${relationField}`;
      const data = await parseRequest(path);
      // Retornar solo el array de objetos relacionados si existe
      const related = data[relationField];
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(related ?? null, null, 2),
          },
        ],
      };
    }
  );

  // Tool: Contar objetos
  server.tool(
    'parse_count',
    'Cuenta el número total de objetos en una clase de Parse Server. Opcionalmente acepta filtros where para contar solo objetos que cumplan ciertos criterios.',

    {
      inputSchema: z.object({
        className: z
          .string()
          .describe('Nombre de la clase, por ejemplo "PatientRecord"'),
        where: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Objeto where de Parse para filtrar'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { className, where } = params;

      const urlParams = new URLSearchParams();
      urlParams.set('count', '1');
      urlParams.set('limit', '0');
      if (where) urlParams.set('where', JSON.stringify(where));

      const data = await parseRequest(`/classes/${className}?${urlParams.toString()}`);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ count: data.count }, null, 2),
          },
        ],
      };
    }
  );

  // Tool: Aggregate (queries complejos)
  server.tool(
    'parse_aggregate',
    'Ejecuta queries de agregación avanzados usando pipeline de MongoDB (match, group, sort, project, etc). Requiere master key. Útil para estadísticas, agrupaciones y cálculos complejos.',

    {
      inputSchema: z.object({
        className: z.string().describe('Nombre de la clase'),
        pipeline: z
          .array(z.record(z.string(), z.unknown()))
          .describe('Pipeline de agregación de MongoDB'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { className, pipeline } = params;

      const data = await parseRequest(
        `/aggregate/${className}`,
        {
          method: 'POST',
          body: JSON.stringify({ pipeline }),
        },
        true
      );

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
