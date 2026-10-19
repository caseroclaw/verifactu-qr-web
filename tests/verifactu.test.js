/**
 * Pruebas del núcleo: vector oficial de la AEAT, semántica de java.net.URLEncoder,
 * validación NIF/NIE/CIF y códigos de error 2001-2006.
 * Ejecutar: node --test
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildQrUrl,
  formatearImporte,
  formatearFecha,
  formatearNumserie,
  tipoNif,
  esValidoNif,
  urlencode,
  urlConsultaJson,
  QRError,
  MAX_NUMSERIE,
} from '../src/verifactu.js';

const BASE_PROD = 'https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR';
const BASE_PRUEBAS = 'https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR';

test('vector oficial de la AEAT, carácter a carácter', () => {
  const esperado = BASE_PROD + '?nif=89890001K&numserie=12345678%26G33&fecha=01-01-2024&importe=241.4';
  assert.equal(buildQrUrl('89890001K', '12345678&G33', '01-01-2024', '241,40'), esperado);
});

test('URL encoding con la semántica de java.net.URLEncoder', () => {
  assert.equal(urlencode('12345678&G33'), '12345678%26G33');
  assert.equal(urlencode('A B'), 'A+B');
  assert.equal(urlencode('A/B'), 'A%2FB');
  assert.equal(urlencode('Ñ'), '%C3%91');
  assert.equal(urlencode('A.1-2_3*4'), 'A.1-2_3*4');
});

test('las cuatro bases del servicio de cotejo', () => {
  const url = (opciones) => buildQrUrl('89890001K', 'A-1', '01-01-2024', '10', opciones);
  assert.match(url({ verifactu: true, entorno: 'produccion' }), /\/wlpl\/TIKE-CONT\/ValidarQR\?/);
  assert.match(url({ verifactu: true, entorno: 'pruebas' }), /^https:\/\/prewww2\.aeat\.es\/wlpl\/TIKE-CONT\/ValidarQR\?/);
  assert.match(url({ verifactu: false, entorno: 'produccion' }), /ValidarQRNoVerifactu\?/);
  assert.match(url({ verifactu: false, entorno: 'pruebas' }), /^https:\/\/prewww2\.aeat\.es\/.*ValidarQRNoVerifactu\?/);
  assert.ok(url({ verifactu: true, entorno: 'pruebas' }).startsWith(BASE_PRUEBAS));
});

test('normalización de importes', () => {
  assert.equal(formatearImporte('241,40'), '241.4');
  assert.equal(formatearImporte('241.40'), '241.4');
  assert.equal(formatearImporte(121), '121');
  assert.equal(formatearImporte('0,00'), '0');
  assert.equal(formatearImporte('-50.00'), '-50');
  assert.equal(formatearImporte('1234567890.99'), '1234567890.99');
});

test('validación de identificaciones fiscales', () => {
  assert.equal(tipoNif('89890001K'), 'DNI');
  assert.equal(tipoNif('12345678Z'), 'DNI');
  assert.equal(tipoNif('X1234567L'), 'NIE');
  assert.equal(tipoNif('B12345674'), 'CIF');
  assert.equal(tipoNif('b-12345674'), 'CIF');
  assert.equal(esValidoNif('89890001J'), false);
  assert.equal(esValidoNif('B12345678'), false);
  assert.equal(esValidoNif('12345678'), false);
});

test('fechas válidas y días inexistentes', () => {
  assert.equal(formatearFecha('29-02-2024'), '29-02-2024');
  assert.throws(() => formatearFecha('29-02-2023'), /2004/);
  assert.throws(() => formatearFecha('2024-01-01'), /2004/);
});

test('códigos de error de la AEAT', () => {
  const codigo = (fn) => {
    try {
      fn();
      return null;
    } catch (e) {
      assert.ok(e instanceof QRError, 'debe ser QRError');
      return e.code;
    }
  };
  assert.equal(codigo(() => buildQrUrl('89890001J', 'A-1', '01-01-2024', '10')), 2001);
  assert.equal(codigo(() => formatearNumserie('')), 2002);
  assert.equal(codigo(() => formatearNumserie('A'.repeat(MAX_NUMSERIE + 1))), 2002);
  assert.equal(codigo(() => formatearNumserie('FACT-Ñ-1')), 2003);
  assert.equal(codigo(() => formatearFecha('01/01/2024')), 2004);
  assert.equal(codigo(() => formatearImporte('12,345')), 2005);
  assert.equal(codigo(() => formatearImporte('abc')), 2005);
  assert.equal(codigo(() => formatearImporte('1234567890123')), 2006);
});

test('formato=json solo para consultar el servicio, nunca dentro del QR', () => {
  const url = buildQrUrl('89890001K', 'A-1', '01-01-2024', '10');
  assert.equal(url.includes('formato='), false);
  assert.equal(urlConsultaJson(url), url + '&formato=json');
  assert.equal(urlConsultaJson(url + '&formato=json'), url + '&formato=json');
});

test('el número de serie con espacios conserva el espacio como +', () => {
  const url = buildQrUrl('89890001K', '2026 A/42', '01-01-2026', '100');
  assert.match(url, /numserie=2026\+A%2F42/);
});
