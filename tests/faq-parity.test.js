/**
 * Paridad entre la FAQ visible y el `FAQPage` del JSON-LD.
 *
 * Google exige que la respuesta marcada como estructurada exista realmente en la
 * página. Antes de la versión 1.1 el JSON-LD llevaba párrafos largos y el HTML
 * mostraba resúmenes de una línea: era un defecto real (y desperdiciaba el texto
 * más citable). Este test falla si las dos copias se separan aunque sea un
 * carácter, y también si alguien vuelve a escribir la FAQ a mano en el HTML.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { faq } from '../src/faq.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(raiz, 'index.html'), 'utf8');

const desescapar = (texto) =>
  texto
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

const textoPlano = (htmlParcial) =>
  desescapar(htmlParcial.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

const visible = /<!-- faq:start -->([\s\S]*?)<!-- faq:end -->/.exec(html);
const ld = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html);

test('la sección visible de la FAQ existe y no está escrita a mano', () => {
  assert.ok(visible, 'faltan los marcadores <!-- faq:start --> / <!-- faq:end -->');
  const detalles = visible[1].match(/<details>[\s\S]*?<\/details>/g) || [];
  assert.equal(detalles.length, faq.length, 'el número de <details> no coincide con src/faq.js');
});

test('cada pregunta y cada respuesta coinciden palabra por palabra con el schema', () => {
  const nodo = JSON.parse(ld[1])['@graph'].find((n) => n['@type'] === 'FAQPage');
  assert.ok(nodo, 'el JSON-LD no tiene nodo FAQPage');
  assert.equal(nodo.mainEntity.length, faq.length, 'el schema no tiene el mismo número de preguntas');

  const detalles = (visible[1].match(/<details>[\s\S]*?<\/details>/g) || []).map((bloque) => {
    const q = /<summary>([\s\S]*?)<\/summary>/.exec(bloque);
    const a = /<p>([\s\S]*?)<\/p>/.exec(bloque);
    return { q: textoPlano(q[1]), a: textoPlano(a[1]) };
  });

  nodo.mainEntity.forEach((item, i) => {
    assert.equal(detalles[i].q, item.name, `la pregunta ${i + 1} no coincide con el schema`);
    assert.equal(
      detalles[i].a,
      item.acceptedAnswer.text.replace(/\s+/g, ' ').trim(),
      `la respuesta ${i + 1} no coincide con el schema`,
    );
  });
});

test('las respuestas tienen longitud citable (no son resúmenes de una línea)', () => {
  assert.ok(faq.length >= 8, 'la FAQ debe tener al menos 8 preguntas');
  for (const { q, a } of faq) {
    assert.ok(a.length >= 250, `respuesta demasiado corta en «${q}» (${a.length} caracteres)`);
    assert.ok(!/<[a-z]/i.test(a), `la respuesta de «${q}» lleva HTML: el schema debe ser texto plano`);
  }
});

test('los bloques nuevos no enlazan a terceros y declaran la fecha', () => {
  const cuerpo = html.slice(html.indexOf('Para quién es esta herramienta'), html.indexOf('English summary'));
  const enlaces = cuerpo.match(/<a [^>]*href="https?:\/\/[^"]+"/g) || [];
  for (const enlace of enlaces) {
    assert.match(
      enlace,
      /href="https:\/\/(plataformaia\.com|caseroclaw\.github\.io|github\.com\/caseroclaw)/,
      'la comparativa no debe enlazar a terceros: ' + enlace,
    );
  }
  assert.match(html, /Actualizado el 21 de octubre de 2026/, 'falta el sello de fecha visible');
  const app = JSON.parse(ld[1])['@graph'].find((n) => n['@type'] === 'SoftwareApplication');
  assert.equal(app.dateModified, '2026-10-21', 'dateModified debe reflejar la última revisión');
  assert.equal(app.softwareVersion, '1.1');
});
