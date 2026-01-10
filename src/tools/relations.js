import { z } from 'zod';
import { parseRequest } from '../utils/parse-client.js';

/**
 * Registra herramientas de relaciones en el servidor MCP
 */
export function registerRelationTools(server) {
  // Tool: Agregar objetos a una relación
  server.tool(
    'parse_add_relation',
    'Agrega uno o más objetos a un campo de tipo Relation en Parse Server. Las relaciones permiten crear vínculos muchos-a-muchos entre objetos. Proporciona className, objectId del objeto que contiene la relación, el nombre del campo de relación y un array de objectIds de los objetos a agregar.',

    {
      inputSchema: z.object({
        className: z
          .string()
          .describe('Nombre de la clase que contiene el campo de relación'),
        objectId: z
          .string()
          .describe('objectId del objeto que contiene la relación'),
        relationField: z
          .string()
          .describe('Nombre del campo de tipo Relation'),
        targetClassName: z
          .string()
          .describe('Nombre de la clase de los objetos relacionados'),
        objectIds: z
          .array(z.string())
          .describe('Array de objectIds de los objetos a agregar a la relación'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { className, objectId, relationField, targetClassName, objectIds } = params;

      // Construir el objeto de operación de relación
      const data = {
        [relationField]: {
          __op: 'AddRelation',
          objects: objectIds.map(id => ({
            __type: 'Pointer',
            className: targetClassName,
            objectId: id,
          })),
        },
      };

      const result = await parseRequest(`/classes/${className}/${objectId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }, true);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Se agregaron ${objectIds.length} objeto(s) a la relación '${relationField}'`,
              result,
            }, null, 2),
          },
        ],
      };
    }
  );

  // Tool: Remover objetos de una relación
  server.tool(
    'parse_remove_relation',
    'Remueve uno o más objetos de un campo de tipo Relation en Parse Server. Proporciona className, objectId del objeto que contiene la relación, el nombre del campo de relación y un array de objectIds de los objetos a remover.',

    {
      inputSchema: z.object({
        className: z
          .string()
          .describe('Nombre de la clase que contiene el campo de relación'),
        objectId: z
          .string()
          .describe('objectId del objeto que contiene la relación'),
        relationField: z
          .string()
          .describe('Nombre del campo de tipo Relation'),
        targetClassName: z
          .string()
          .describe('Nombre de la clase de los objetos relacionados'),
        objectIds: z
          .array(z.string())
          .describe('Array de objectIds de los objetos a remover de la relación'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { className, objectId, relationField, targetClassName, objectIds } = params;

      // Construir el objeto de operación de relación
      const data = {
        [relationField]: {
          __op: 'RemoveRelation',
          objects: objectIds.map(id => ({
            __type: 'Pointer',
            className: targetClassName,
            objectId: id,
          })),
        },
      };

      const result = await parseRequest(`/classes/${className}/${objectId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }, true);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Se removieron ${objectIds.length} objeto(s) de la relación '${relationField}'`,
              result,
            }, null, 2),
          },
        ],
      };
    }
  );

  // Tool: Consultar objetos en una relación
  server.tool(
    'parse_query_relation',
    'Consulta y obtiene los objetos relacionados en un campo de tipo Relation. Soporta filtros, ordenamiento y paginación para explorar las relaciones existentes.',

    {
      inputSchema: z.object({
        className: z
          .string()
          .describe('Nombre de la clase que contiene el campo de relación'),
        objectId: z
          .string()
          .describe('objectId del objeto que contiene la relación'),
        relationField: z
          .string()
          .describe('Nombre del campo de tipo Relation'),
        where: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Filtros adicionales en formato JSON (opcional)'),
        order: z
          .string()
          .optional()
          .describe('Campo para ordenar. Prefijo "-" para descendente (ej: "-createdAt")'),
        limit: z
          .number()
          .optional()
          .describe('Número máximo de resultados (default: 100)'),
        skip: z
          .number()
          .optional()
          .describe('Número de resultados a saltar para paginación'),
      }),
    },
    async (input) => {
      const params = input.inputSchema || input;
      const { className, objectId, relationField, where, order, limit, skip } = params;

      // Construir el query de relación
      const query = {
        $relatedTo: {
          object: {
            __type: 'Pointer',
            className: className,
            objectId: objectId,
          },
          key: relationField,
        },
      };

      // Combinar con where adicional si existe
      const finalWhere = where ? { ...query, ...where } : query;

      const urlParams = new URLSearchParams({
        where: JSON.stringify(finalWhere),
      });

      if (order) urlParams.set('order', order);
      if (limit) urlParams.set('limit', limit.toString());
      if (skip) urlParams.set('skip', skip.toString());

      // Para obtener el targetClassName, primero obtenemos el esquema del campo
      const schemaData = await parseRequest(`/schemas/${className}`, {}, false);
      const targetClassName = schemaData.fields[relationField]?.targetClass;

      if (!targetClassName) {
        throw new Error(`No se pudo determinar la clase objetivo para el campo de relación '${relationField}'`);
      }

      const path = `/classes/${targetClassName}?${urlParams.toString()}`;
      const data = await parseRequest(path, {}, true);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              count: data.results?.length || 0,
              results: data.results || [],
            }, null, 2),
          },
        ],
      };
    }
  );
}
