import 'dotenv/config';

export const PARSE_URL = process.env.PARSE_URL || process.env.PARSE_SERVER_URL;
export const PARSE_APP_ID = process.env.PARSE_APP_ID;
export const PARSE_REST_KEY = process.env.PARSE_REST_KEY;
export const PARSE_MASTER_KEY = process.env.PARSE_MASTER_KEY;
export const ALLOW_SELF_SIGNED = process.env.ALLOW_SELF_SIGNED_CERT === 'true' || process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0';

if (!PARSE_URL || !PARSE_APP_ID) {
  console.error(
    '[mcp-parse-server] Faltan variables de entorno: PARSE_URL / PARSE_APP_ID'
  );
  process.exit(1);
}

if (!PARSE_REST_KEY && !PARSE_MASTER_KEY) {
  console.error(
    '[mcp-parse-server] Debes proporcionar al menos PARSE_REST_KEY o PARSE_MASTER_KEY'
  );
  process.exit(1);
}

if (ALLOW_SELF_SIGNED) {
  console.error('[mcp-parse-server] ⚠️  Certificados autofirmados permitidos (no usar en producción)');
}

// Mostrar configuración (ocultando claves sensibles)
const maskKey = (key) => {
  if (!key) return 'no configurado';
  if (key.length <= 8) return '***';
  return key.substring(0, 4) + '***' + key.substring(key.length - 4);
};

console.error('[mcp-parse-server] Configuración:');
console.error(`  PARSE_URL: ${PARSE_URL}`);
console.error(`  PARSE_APP_ID: ${maskKey(PARSE_APP_ID)}`);
console.error(`  PARSE_REST_KEY: ${maskKey(PARSE_REST_KEY)}`);
console.error(`  PARSE_MASTER_KEY: ${maskKey(PARSE_MASTER_KEY)}`);
console.error(`  ALLOW_SELF_SIGNED: ${ALLOW_SELF_SIGNED}`);
