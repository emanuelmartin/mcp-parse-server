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
const { PARSE_URL, PARSE_APP_ID, PARSE_REST_KEY, PARSE_MASTER_KEY } = process.env;

/**
 * Helper para llamar al REST API de Parse
 * @param {string} path - Ruta del endpoint (ej: /classes/MyClass)
 * @param {object} options - Opciones de fetch
 * @param {boolean} useMasterKey - Si usar master key en lugar de REST key (por defecto true si hay master key y no hay REST key)
 */
export async function parseRequest(path, options = {}, useMasterKey = !PARSE_REST_KEY && !!PARSE_MASTER_KEY) {
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
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Parse error ${res.status}: ${text}`);
  }

  return res.json();
}
