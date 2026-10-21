#!/usr/bin/env bash
# Migración local a pnpm: córrelo UNA vez después de bajar (pull) el cambio de npm a pnpm.
#
#   bash scripts/pnpm-setup.sh            # instala pnpm si falta, limpia lo de npm y reinstala con pnpm
#   bash scripts/pnpm-setup.sh --dry-run  # sólo muestra qué haría
#
# - Carpetas con pnpm-lock.yaml (o dentro de un workspace de pnpm): se borran sus node_modules armados por npm
#   y se reinstala con `pnpm install --frozen-lockfile`. El store global de pnpm se comparte entre repos y worktrees.
# - Carpetas que siguen con npm (tienen package-lock.json; p. ej. cloud/ o server/ que se instalan en servidores):
#   NO se tocan sus node_modules; sólo se corre `npm ci` si no tienen node_modules.
set -euo pipefail

DRY=0; if [ "${1:-}" = "--dry-run" ]; then DRY=1; fi
ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$ROOT"
run() { echo "+ $*"; [ "$DRY" = 1 ] || "$@"; }

PNPM_VERSION=$(node -e "try{const p=require('./package.json').packageManager||'';const m=p.match(/^pnpm@([0-9.]+)/);process.stdout.write(m?m[1]:'11.11.0')}catch(e){process.stdout.write('11.11.0')}" 2>/dev/null || echo 11.11.0)

# 1. Node ≥ 22.13 (pnpm 11 no arranca en versiones anteriores). Con Volta se usa Node 22 sólo para pnpm.
PNPM="pnpm"
if ! node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" 2>/dev/null; then
  if command -v volta >/dev/null 2>&1; then
    run volta install node@22 >/dev/null 2>&1 || true
    PNPM="volta run --node 22 pnpm"
  else
    echo "! pnpm $PNPM_VERSION necesita Node 22.13 o más; tienes $(node -v 2>/dev/null || echo 'sin Node')."
    echo "  Instala Volta (https://volta.sh) o Node 22 (nvm install 22) y vuelve a correr este script."
    exit 1
  fi
fi

# 2. pnpm de la versión del repo
if ! command -v pnpm >/dev/null 2>&1 || [ "$($PNPM --version 2>/dev/null)" != "$PNPM_VERSION" ]; then
  if command -v volta >/dev/null 2>&1; then run volta install "pnpm@$PNPM_VERSION"
  elif command -v corepack >/dev/null 2>&1; then run corepack enable; run corepack prepare "pnpm@$PNPM_VERSION" --activate
  else run npm install -g "pnpm@$PNPM_VERSION"; fi
fi

# 3. Carpetas: cuáles son pnpm y cuáles siguen con npm (compatible con la bash 3.2 de macOS)
PNPM_DIRS=$(git ls-files '*pnpm-lock.yaml' | xargs -n1 dirname 2>/dev/null | sort -u)
# Siguen con npm: carpetas con package-lock.json (versionado o no) y submódulos de git (p. ej. cloud/)
SUBMODULES=$(git config --file .gitmodules --get-regexp '\.path$' 2>/dev/null | awk '{print $2}')
NPM_DIRS=$( { git ls-files '*package-lock.json' | xargs -n1 dirname 2>/dev/null
              find . -name package-lock.json -not -path '*/node_modules/*' 2>/dev/null | xargs -n1 dirname | sed 's#^\./##'
              echo "$SUBMODULES"; } | grep -v '^$' | sort -u)
[ -n "$PNPM_DIRS" ] || { echo "Este repo no tiene pnpm-lock.yaml: nada que hacer."; exit 0; }

is_npm_dir() {
  local d=$1 n
  for n in $NPM_DIRS; do
    if [ "$d" = "$n" ] || case "$d" in "$n"/*) true;; *) false;; esac; then return 0; fi
  done
  return 1
}

# 4. Borrar node_modules armados por npm en las partes pnpm (raíz y paquetes), nunca en carpetas npm
for d in $PNPM_DIRS; do
  for nm in $(find "$d" -name node_modules -type d -prune 2>/dev/null); do
    rel=$(dirname "$nm"); rel=${rel#./}
    if is_npm_dir "$rel"; then continue; fi
    # node_modules hechos por pnpm traen .modules.yaml: se conservan (pnpm los reutiliza)
    if [ -f "$nm/.modules.yaml" ]; then continue; fi
    run rm -rf "$nm"
  done
  run bash -c "cd '$d' && $PNPM install --frozen-lockfile"
done

# 5. Carpetas que siguen con npm: sólo instalar si les falta node_modules
for n in $NPM_DIRS; do
  if [ -f "$n/package-lock.json" ] && [ ! -d "$n/node_modules" ]; then run bash -c "cd '$n' && npm ci"; fi
done

echo "Listo: este repo ya usa pnpm $PNPM_VERSION. A partir de ahora: pnpm install / pnpm run <script> (en un worktree nuevo basta con pnpm install)."
[ "$PNPM" = "pnpm" ] || echo "Nota: tu Node por defecto es menor a 22.13; pnpm corre con Node 22 vía Volta (o fija Node 22 en este repo: volta pin node@22)."
