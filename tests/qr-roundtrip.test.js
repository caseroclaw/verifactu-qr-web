/**
 * Verificación de ida y vuelta: la URL construida por el núcleo se dibuja con el
 * generador QR vendorizado y se vuelve a decodificar con un decodificador
 * independiente (jsQR). Si el texto decodificado coincide, el QR que verá el
 * usuario codifica exactamente la URL de la AEAT.
 *
 * Requiere la dependencia de desarrollo jsqr (npm ci).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { buildQrUrl } from '../src/verifactu.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

function cargarGenerador() {
  const contexto = { module: { exports: {} } };
  contexto.exports = contexto.module.exports;
  vm.createContext(contexto);
  vm.runInContext(readFileSync(join(raiz, 'vendor/qrcode.js'), 'utf8'), contexto);
  return contexto.module.exports;
}

function matrizARgba(qr, escala = 4, margenModulos = 4) {
  const n = qr.getModuleCount();
  const lado = (n + margenModulos * 2) * escala;
  const datos = new Uint8ClampedArray(lado * lado * 4).fill(255);
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      const moduloFila = Math.floor(y / escala) - margenModulos;
      const moduloColumna = Math.floor(x / escala) - margenModulos;
      const dentro = moduloFila >= 0 && moduloFila < n && moduloColumna >= 0 && moduloColumna < n;
      if (dentro && qr.isDark(moduloFila, moduloColumna)) {
        const i = (y * lado + x) * 4;
        datos[i] = datos[i + 1] = datos[i + 2] = 0;
      }
    }
  }
  return { datos, lado };
}

test('el QR decodificado devuelve exactamente la URL de la AEAT', async (t) => {
  let jsQR;
  try {
    jsQR = (await import('jsqr')).default;
  } catch {
    t.skip('jsqr no instalado (npm ci)');
    return;
  }
  const qrcode = cargarGenerador();
  assert.equal(typeof qrcode, 'function', 'el generador vendorizado debe exportar la función qrcode');

  const url = buildQrUrl('89890001K', '12345678&G33', '01-01-2024', '241,40');
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();

  const { datos, lado } = matrizARgba(qr);
  const leido = jsQR(datos, lado, lado);
  assert.ok(leido, 'jsQR debe encontrar un QR en la matriz generada');
  assert.equal(leido.data, url);

  const svg = qr.createSvgTag({ cellSize: 3, margin: 8, scalable: true });
  assert.ok(svg.startsWith('<svg'), 'se genera también el SVG para pruebas de impresión');
  assert.ok(svg.includes('path'), 'el SVG contiene los módulos');
});
