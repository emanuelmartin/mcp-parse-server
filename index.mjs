import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import './src/utils/config.js';
import { registerReadTools } from './src/tools/read.js';
import { registerWriteTools } from './src/tools/write.js';
import { registerSchemaTools } from './src/tools/schema.js';
import { registerSecurityTools } from './src/tools/security.js';
import { registerCloudTools } from './src/tools/cloud.js';

// =============================
// Crear servidor MCP
// =============================
const server = new McpServer({
  name: 'parse-server',
  version: '1.0.0',
});

// =============================
// Registrar todas las herramientas
// =============================
registerReadTools(server);
registerWriteTools(server);
registerSchemaTools(server);
registerSecurityTools(server);
registerCloudTools(server);

// =============================
// Conectar por STDIO (para VS Code / Copilot)
// =============================
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[mcp-parse-server] Servidor MCP iniciado correctamente');
}

runServer().catch((err) => {
  console.error('[mcp-parse-server] Error al iniciar:', err);
  process.exit(1);
});

// opcional, para cerrar bonito si se muere stdin
process.stdin.on('close', () => {
  console.error('[mcp-parse-server] STDIN cerrado, apagando servidor MCP');
  server.close();
});