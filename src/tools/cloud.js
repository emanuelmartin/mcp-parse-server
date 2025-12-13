import { z } from 'zod';
import { parseRequest } from '../utils/parse-client.js';

/**
 * Registra herramientas de Cloud Functions y Jobs en el servidor MCP
 */
export function registerCloudTools(server) {
  // Tool: Llamar Cloud Function
  server.tool(
    'parse_call_cloud_function',
    'Ejecuta una Cloud Function definida en Parse Server. Proporciona functionName y opcionalmente params como objeto JSON. Retorna el resultado de la función.',

    {
      inputSchema: z.object({
        functionName: z.string().describe('Nombre de la Cloud Function'),
        params: z
          .record(z.string(), z.unknown())
          .optional()
          .describe(
            'Parámetros de la función, por ejemplo { "patientId": "..." }'
          ),
      }),
    },
    async (input) => {

      const inputParams = input.inputSchema || input;
      const { functionName, params } = inputParams;

      const data = await parseRequest(`/functions/${functionName}`, {
        method: 'POST',
        body: JSON.stringify(params || {}),
      });

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

  // Tool: Ejecutar Cloud Job
  server.tool(
    'parse_run_job',
    'Ejecuta un Background Job (tarea programada) definido en Parse Server. Útil para tareas pesadas, limpiezas, reportes, etc. Requiere master key.',

    {
      inputSchema: z.object({
        jobName: z.string().describe('Nombre del job'),
        params: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Parámetros del job'),
      }),
    },
    async (input) => {

      const inputParams = input.inputSchema || input;
      const { jobName, params } = inputParams;

      const data = await parseRequest(`/jobs/${jobName}`, {
        method: 'POST',
        body: JSON.stringify(params || {}),
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

  // Tool: Obtener información de Cloud Code
  server.tool(
    'parse_get_cloud_code_info',
    'Lista todas las Cloud Functions y Background Jobs disponibles en Parse Server. Útil para descubrir qué funciones puedes llamar. Requiere master key.',

    {
      inputSchema: z.object({}),
    },
    async () => {
      const data = await parseRequest('/cloudCode', {}, true);

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
