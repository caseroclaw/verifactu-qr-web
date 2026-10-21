#!/usr/bin/env node
/**
 * Genera desde src/faq.js (fuente única) las dos copias de las preguntas
 * frecuentes que viven en index.html:
 *   1. la sección visible, entre los marcadores <!-- faq:start --> y <!-- faq:end -->;
 *   2. el `FAQPage` del JSON-LD, dentro del bloque application/ld+json.
 *
 * Uso: node tools/build-faq.js   (y luego npm test)
 *
 * Es idempotente: ejecutarlo dos veces produce el mismo fichero. Si la página
 * no tiene los marcadores o el JSON-LD, falla en vez de escribir a ciegas.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { faq } from '../src/faq.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ruta = join(raiz, 'index.html');

const escapar = (texto) =>
  texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

let html = readFileSync(ruta, 'utf8');

if (!/<!-- faq:start -->[\s\S]*?<!-- faq:end -->/.test(html)) {
  console.error('build-faq: faltan los marcadores <!-- faq:start --> / <!-- faq:end -->');
  process.exit(1);
}

const detalles = faq
  .map(({ q, a }) => `        <details>\n          <summary>${escapar(q)}</summary>\n          <p>${escapar(a)}</p>\n        </details>`)
  .join('\n');

html = html.replace(
  /(<!-- faq:start -->)[\s\S]*?(<!-- faq:end -->)/,
  `$1\n${detalles}\n        $2`,
);

const bloque = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html);
if (!bloque) {
  console.error('build-faq: no hay bloque JSON-LD en index.html');
  process.exit(1);
}

let datos;
try {
  datos = JSON.parse(bloque[1]);
} catch (error) {
  console.error('build-faq: el JSON-LD no parsea: ' + error.message);
  process.exit(1);
}

const nodo = (datos['@graph'] || []).find((n) => n['@type'] === 'FAQPage');
if (!nodo) {
  console.error('build-faq: el JSON-LD no tiene un nodo FAQPage');
  process.exit(1);
}

nodo.mainEntity = faq.map(({ q, a }) => ({
  '@type': 'Question',
  name: q,
  acceptedAnswer: { '@type': 'Answer', text: a },
}));

const json = JSON.stringify(datos, null, 2).replace(/\n/g, '\n  ');
html = html.replace(
  /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
  `<script type="application/ld+json">\n  ${json}\n  </script>`,
);

writeFileSync(ruta, html);
console.log(`build-faq: ${faq.length} preguntas sincronizadas (visible + FAQPage)`);
