# Instrucciones para agentes

## ⚠️ Reinstalar dependencias: este repo pasó de npm a pnpm (2026-10-20)

**Agentes y personas, antes de instalar, compilar, probar o correr cualquier script:**

1. Si existe `node_modules/` pero **no** existe `node_modules/.modules.yaml`, esas dependencias las instaló npm y hay que
   reinstalarlas una vez: `bash scripts/pnpm-setup.sh` (`--dry-run` muestra qué hará sin cambiar nada).
2. A partir de ahí usa `pnpm install`, `pnpm run <script>` y `pnpm exec <bin>`, no `npm install`, `npm run` ni `npx`.
   En un worktree nuevo basta con `pnpm install --frozen-lockfile` (reutiliza el store global, no descarga de nuevo).
3. Las carpetas con `package-lock.json` (las que se instalan en servidores, p. ej. `cloud/` o `server/`) **siguen con npm**:
   ahí `npm ci`. No generes `pnpm-lock.yaml` en ellas.
4. Nunca copies ni enlaces `node_modules` entre worktrees. pnpm 11 necesita Node ≥ 22.13 (el script usa Volta si tu Node es menor).

Si otra parte de este documento muestra comandos `npm …` fuera de esas carpetas, usa su equivalente en pnpm.
