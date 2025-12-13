import 'dotenv/config';

export const PARSE_URL = process.env.PARSE_URL;
export const PARSE_APP_ID = process.env.PARSE_APP_ID;
export const PARSE_REST_KEY = process.env.PARSE_REST_KEY;
export const PARSE_MASTER_KEY = process.env.PARSE_MASTER_KEY;

if (!PARSE_URL || !PARSE_APP_ID || !PARSE_REST_KEY) {
  console.error(
    '[mcp-parse-server] Faltan variables de entorno: PARSE_URL / PARSE_APP_ID / PARSE_REST_KEY'
  );
  process.exit(1);
}
