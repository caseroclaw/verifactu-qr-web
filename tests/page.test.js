/**
 * Comprobaciones de la página publicada: contenido citable, enlaces de marca sin
 * nofollow y ausencia de recursos remotos (la herramienta debe funcionar offline).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(raiz, 'index.html'), 'utf8');

test('la página enlaza a plataformaia.com sin nofollow', () => {
  const enlaces = html.match(/<a [^>]*href="https:\/\/plataformaia\.com[^"]*"[^>]*>/g) || [];
  assert.ok(enlaces.length >= 2, 'debe haber al menos dos enlaces a plataformaia.com');
  for (const enlace of enlaces) {
    assert.ok(!/rel="[^"]*nofollow/.test(enlace), 'ningún enlace de marca debe llevar nofollow: ' + enlace);
  }
});

test('la página enlaza a la guía de VeriFactu del blog', () => {
  assert.match(html, /href="https:\/\/plataformaia\.com\/es\/blog\/verifactu-2027-pymes-fechas-preparacion"/);
});

test('el JSON-LD declara SoftwareApplication y FAQPage válidas', () => {
  const bloque = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html);
  assert.ok(bloque, 'debe existir un bloque JSON-LD');
  const datos = JSON.parse(bloque[1]);
  const tipos = (datos['@graph'] || []).map((n) => n['@type']);
  assert.ok(tipos.includes('SoftwareApplication'), 'falta SoftwareApplication');
  assert.ok(tipos.includes('FAQPage'), 'falta FAQPage');
  const faq = datos['@graph'].find((n) => n['@type'] === 'FAQPage');
  assert.equal(faq.mainEntity.length, 6, 'deben declararse 6 preguntas frecuentes');
  for (const item of faq.mainEntity) {
    assert.equal(item['@type'], 'Question');
    assert.ok(item.name.length > 15 && item.acceptedAnswer.text.length > 80, 'respuesta demasiado corta: ' + item.name);
  }
  const app = datos['@graph'].find((n) => n['@type'] === 'SoftwareApplication');
  assert.equal(app.offers.price, '0', 'la herramienta debe declararse gratuita');
  assert.equal(app.creator.url, 'https://plataformaia.com/');
});

test('la página es autocontenida: sin scripts, hojas ni imágenes remotas', () => {
  const remotos = html.match(/(?:src|href)="https?:\/\/[^"]+"/g) || [];
  const permitidos = remotos.filter((u) => !/^href="https:\/\/(plataformaia\.com|github\.com|caseroclaw\.github\.io)/.test(u) && !/rel="canonical"/.test(u));
  const soloEnlaces = permitidos.filter((u) => !/^href=/.test(u));
  assert.deepEqual(soloEnlaces, [], 'no debe cargarse ningún recurso remoto: ' + soloEnlaces.join(', '));
});

test('los recursos locales referenciados existen', () => {
  for (const ruta of ['styles.css', 'vendor/qrcode.js', 'src/app.js']) {
    assert.ok(html.includes(ruta), 'la página no referencia ' + ruta);
  }
  for (const ruta of ['styles.css', 'vendor/qrcode.js', 'src/app.js', 'src/verifactu.js']) {
    assert.ok(existsSync(join(raiz, ruta)), 'falta el fichero ' + ruta);
  }
  const app = readFileSync(join(raiz, 'src/app.js'), 'utf8');
  assert.match(app, /from '\.\/verifactu\.js'/, 'la interfaz debe importar el núcleo verifactu.js');
});

test('el contenido citable incluye fechas, parámetros y códigos AEAT', () => {
  for (const texto of ['1 de enero de 2027', '1 de julio de 2027', 'numserie', 'formato=json', '2001', '2006', 'java.net.URLEncoder']) {
    assert.ok(html.includes(texto), 'falta el dato citable: ' + texto);
  }
});
