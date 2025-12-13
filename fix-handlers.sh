#!/bin/bash

# Script para corregir todos los handlers que reciben input
# Añade la línea: const params = input.inputSchema || input;

for file in src/tools/*.js; do
  echo "Processing $file..."
  
  # Usar perl para hacer el reemplazo multi-línea
  perl -i -pe 's/async \(input\) => \{\n      const \{ /async (input) => {\n      const params = input.inputSchema || input;\n      const { /g' "$file"
  
  # También necesitamos cambiar las referencias de input a params en las destructuraciones
  sed -i '' 's/const { \(.*\) } = input;/const { \1 } = params;/g' "$file"
done

echo "Done!"
