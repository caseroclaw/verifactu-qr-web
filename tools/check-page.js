#!/usr/bin/env node
/**
 * Verificación previa al despliegue: la página debe compilar como HTML estático
 * citable, enlazar a plataformaia.com sin nofollow y no cargar nada remoto.
 * Uso: node tools/check-page.js
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(raiz, 'index.html'), 'utf8');
const fallos = [];

const enlaces = html.match(/<a [^>]*href="https:\/\/plataformaia\.com[^"]*"[^>]*>/g) || [];
if (enlaces.length < 2) fallos.push('menos de 2 enlaces a plataformaia.com');
for (const enlace of enlaces) {
  if (/rel="[^"]*nofollow/.test(enlace)) fallos.push('enlace con nofollow: ' + enlace);
}
if (!/href="https:\/\/plataformaia\.com\/es\/blog\/verifactu-2027-pymes-fechas-preparacion"/.test(html)) {
  fallos.push('falta el enlace a la guía de VeriFactu del blog');
}
for (const ruta of ['styles.css', 'vendor/qrcode.js', 'src/app.js']) {
  if (!html.includes(ruta)) fallos.push('la página no referencia ' + ruta);
}
for (const ruta of ['styles.css', 'vendor/qrcode.js', 'src/app.js', 'src/verifactu.js']) {
  if (!existsSync(join(raiz, ruta))) fallos.push('falta el fichero ' + ruta);
}
const remotos = (html.match(/<script[^>]*src="https?:[^"]*"/g) || [])
  .concat((html.match(/<link[^>]*href="https?:[^"]*"/g) || []).filter((t) => !/rel="canonical"/.test(t)));
if (remotos.length) fallos.push('recursos remotos detectados: ' + remotos.join(', '));

if (fallos.length) {
  console.error('check-page: FALLOS\n- ' + fallos.join('\n- '));
  process.exit(1);
}
console.log('check-page: OK (' + enlaces.length + ' enlaces de marca, sin nofollow, sin recursos remotos)');
