import https from 'https';
import http from 'http';
import { ALLOW_SELF_SIGNED, PARSE_URL, PARSE_APP_ID, PARSE_REST_KEY, PARSE_MASTER_KEY } from './config.js';

/**
 * Obtiene las relaciones (pointers y relations) de una clase en Parse Server
 * @param {string} className - Nombre de la clase
 * @returns {Promise<Array<{field: string, type: string, targetClass?: string}>>}
 */
export async function getClassRelations(className) {
  // Requiere master key
  const schema = await parseRequest(`/schemas/${className}`, {}, true);
  const relations = [];
  if (schema && schema.fields) {
    for (const [field, def] of Object.entries(schema.fields)) {
      if (def.type === 'Pointer' || def.type === 'Relation') {
        relations.push({
          field,
          type: def.type,
          targetClass: def.targetClass,
        });
      }
    }
  }
  return relations;
}

// Agentes para HTTP/HTTPS que permiten certificados autofirmados si está configurado
const getAgent = (url) => {
  if (!ALLOW_SELF_SIGNED) return undefined;
  
  if (url.startsWith('https://')) {
    return new https.Agent({ rejectUnauthorized: false });
  } else if (url.startsWith('http://')) {
    return new http.Agent();
  }
  return undefined;
};

/**
 * Helper para llamar al REST API de Parse
 * @param {string} path - Ruta del endpoint (ej: /classes/MyClass)
 * @param {object} options - Opciones de fetch
 * @param {boolean} useMasterKey - Si usar master key en lugar de REST key (por defecto true si hay master key disponible)
 */
export async function parseRequest(path, options = {}, useMasterKey = !!PARSE_MASTER_KEY) {
  if (!PARSE_URL) {
    throw new Error('PARSE_URL is not defined. Check your environment variables.');
  }
  const url = `${PARSE_URL}${path}`;

  const headers = {
    'X-Parse-Application-Id': PARSE_APP_ID,
    'Content-Type': 'application/json',
  };

  if (useMasterKey && PARSE_MASTER_KEY) {
    headers['X-Parse-Master-Key'] = PARSE_MASTER_KEY;
  } else if (PARSE_REST_KEY) {
    headers['X-Parse-REST-API-Key'] = PARSE_REST_KEY;
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
    agent: getAgent(url),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Parse error ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * Verifica la conexión con Parse Server
 */
export async function healthCheck() {
  try {
    console.error('[mcp-parse-server] Debug - PARSE_URL en healthCheck:', PARSE_URL);
    console.error('[mcp-parse-server] Debug - typeof PARSE_URL:', typeof PARSE_URL);
    await parseRequest('/health', {}, false);
    console.error('[mcp-parse-server] ✓ Conexión con Parse Server establecida');
  } catch (error) {
    console.error('[mcp-parse-server] ⚠️  No se pudo conectar con Parse Server:', error.message);
    // No lanzamos error para permitir que el servidor MCP inicie de todas formas
  }
}
