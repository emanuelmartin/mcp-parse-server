import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Crear carpeta dist
const distDir = path.join(__dirname, 'dist');

// Limpiar dist si existe
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
  console.log('✓ Carpeta dist limpiada');
}

fs.mkdirSync(distDir, { recursive: true });

// Copiar index.mjs a dist/index.js
const sourceIndex = path.join(__dirname, 'index.mjs');
const destIndex = path.join(distDir, 'index.js');
fs.copyFileSync(sourceIndex, destIndex);
console.log('✓ Copiado: dist/index.js');

// Copiar carpeta src
const srcDir = path.join(__dirname, 'src');
const distSrcDir = path.join(distDir, 'src');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const files = fs.readdirSync(src);
  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);

    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

copyDir(srcDir, distSrcDir);
console.log('✓ Copiado: dist/src');

console.log('\n✅ Build completado! Carpeta dist creada con éxito');
