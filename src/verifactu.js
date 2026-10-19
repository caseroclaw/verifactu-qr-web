/**
 * Núcleo de VeriFactu QR: URL del QR tributario y validaciones.
 *
 * Especificación aplicada:
 *  - Real Decreto 1007/2023 (BOE-A-2023-24840).
 *  - Orden HAC/1177/2024, artículos 20 y 21.
 *  - AEAT, «Detalles técnicos para la implementación del código QR y de la URL
 *    del servicio de cotejo o remisión de información» (URL encoding UTF-8 con
 *    las mismas reglas que java.net.URLEncoder).
 *
 * Port fiel de la librería Python `verifactu-qr` (MIT, github.com/caseroclaw/verifactu-qr).
 * Módulo puro: sin DOM, sin red, sin almacenamiento.
 */

export const BASES = {
  'produccion|true': 'https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR',
  'pruebas|true': 'https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR',
  'produccion|false': 'https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQRNoVerifactu',
  'pruebas|false': 'https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQRNoVerifactu',
};

export const MAX_NUMSERIE = 60;
export const MAX_ENTERA_IMPORTE = 12;

const SAFE = new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-*_'.split(''));
const LETRAS_DNI = 'TRWAGMYFPDXBNJZSQVHLCKE';
const LETRAS_CIF = 'JABCDEFGHI'; // índice 0 -> J ... índice 9 -> I
const CIF_LETRA_OBLIGATORIA = new Set('PQSNWK'.split(''));
const CIF_DIGITO_OBLIGATORIO = new Set('ABEH'.split(''));
const CIF_PREFIJOS = new Set('ABCDEFGHJKLMNPQRSUVW'.split(''));

/** Error de validación con el código que devuelve la AEAT (2001-2006). */
export class QRError extends Error {
  constructor(code, message) {
    super('[' + code + '] ' + message);
    this.name = 'QRError';
    this.code = code;
  }
}

/** Codifica igual que java.net.URLEncoder.encode(valor, "UTF-8"). */
export function urlencode(valor) {
  const bytes = new TextEncoder().encode(String(valor));
  let out = '';
  for (const byte of bytes) {
    const caracter = String.fromCharCode(byte);
    if (SAFE.has(caracter)) out += caracter;
    else if (caracter === ' ') out += '+';
    else out += '%' + byte.toString(16).toUpperCase().padStart(2, '0');
  }
  return out;
}

/** Quita espacios, puntos y guiones y pasa a mayúsculas. */
export function normalizarNif(valor) {
  return String(valor).trim().toUpperCase().replace(/[ .-]/g, '');
}

function letraDni(numero) {
  return LETRAS_DNI[numero % 23];
}

function cifValido(valor) {
  const prefijo = valor[0];
  const digitos = valor.slice(1, 8);
  const control = valor[8];
  if (!CIF_PREFIJOS.has(prefijo)) return false;
  let pares = 0;
  for (const i of [1, 3, 5]) pares += Number(digitos[i]);
  let impares = 0;
  for (const i of [0, 2, 4, 6]) {
    const doble = Number(digitos[i]) * 2;
    impares += Math.floor(doble / 10) + (doble % 10);
  }
  const digitoControl = (10 - ((pares + impares) % 10)) % 10;
  if (CIF_LETRA_OBLIGATORIA.has(prefijo)) return control === LETRAS_CIF[digitoControl];
  if (CIF_DIGITO_OBLIGATORIO.has(prefijo)) return control === String(digitoControl);
  return control === String(digitoControl) || control === LETRAS_CIF[digitoControl];
}

/** Devuelve 'DNI', 'NIE', 'CIF' o null si la identificación no es válida. */
export function tipoNif(valor) {
  const v = normalizarNif(valor);
  if (/^\d{8}[A-Z]$/.test(v)) return v[8] === letraDni(Number(v.slice(0, 8))) ? 'DNI' : null;
  if (/^[XYZ]\d{7}[A-Z]$/.test(v)) {
    const numero = Number({ X: '0', Y: '1', Z: '2' }[v[0]] + v.slice(1, 8));
    return v[8] === letraDni(numero) ? 'NIE' : null;
  }
  if (/^[A-Z]\d{7}[A-Z0-9]$/.test(v)) return cifValido(v) ? 'CIF' : null;
  return null;
}

export function esValidoNif(valor) {
  return tipoNif(valor) !== null;
}

export function validarNif(nif) {
  const v = String(nif).trim();
  if (!esValidoNif(v)) throw new QRError(2001, 'El NIF tiene un formato erróneo o no es válido: ' + JSON.stringify(v));
  return v;
}

export function formatearNumserie(numserie) {
  const s = String(numserie);
  if (s.length > MAX_NUMSERIE) throw new QRError(2002, 'El número de serie excede los ' + MAX_NUMSERIE + ' caracteres');
  for (const caracter of s) {
    const c = caracter.charCodeAt(0);
    if (c < 32 || c > 126) throw new QRError(2003, 'El número de serie contiene caracteres no permitidos (solo ASCII 32-126): ' + JSON.stringify(s));
  }
  if (!s.trim()) throw new QRError(2002, 'El número de serie no puede estar vacío');
  return s;
}

export function formatearFecha(fecha) {
  const texto = String(fecha).trim();
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(texto);
  if (!m) throw new QRError(2004, 'La fecha debe tener el formato DD-MM-AAAA: ' + JSON.stringify(texto));
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const anio = Number(m[3]);
  const dias = [31, (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (mes < 1 || mes > 12 || dia < 1 || dia > dias[mes - 1]) {
    throw new QRError(2004, 'La fecha debe tener el formato DD-MM-AAAA: ' + JSON.stringify(texto));
  }
  return texto;
}

export function formatearImporte(importe) {
  let texto = typeof importe === 'string' ? importe.trim().replace(',', '.') : String(importe);
  if (/[eE]/.test(texto) || !/^[+-]?(\d+)(\.\d*)?$|^[+-]?\.\d+$/.test(texto)) {
    throw new QRError(2005, 'El importe tiene un formato incorrecto: ' + JSON.stringify(importe));
  }
  const negativo = texto.startsWith('-');
  const sinSigno = texto.replace(/^[+-]/, '');
  const [enteraCruda, decimalCruda = ''] = sinSigno.split('.');
  if (enteraCruda.length > MAX_ENTERA_IMPORTE) {
    throw new QRError(2006, 'El importe excede los ' + MAX_ENTERA_IMPORTE + ' dígitos de parte entera');
  }
  if (decimalCruda.length > 2) {
    throw new QRError(2005, 'El importe no admite más de 2 decimales: ' + JSON.stringify(importe));
  }
  const entera = enteraCruda.replace(/^0+(?=\d)/, '') || '0';
  const decimal = decimalCruda.replace(/0+$/, '');
  let out = decimal ? entera + '.' + decimal : entera;
  const esCero = /^0(\.0*)?$/.test(out);
  if (negativo && !esCero) out = '-' + out;
  return out;
}

/**
 * Devuelve la URL que debe contener el QR tributario de la factura.
 * verifactu=true -> sistema VERI*FACTU; entorno: 'produccion' | 'pruebas'.
 */
export function buildQrUrl(nif, numserie, fecha, importe, { verifactu = true, entorno = 'produccion' } = {}) {
  if (entorno !== 'produccion' && entorno !== 'pruebas') throw new QRError(2004, "entorno debe ser 'produccion' o 'pruebas'");
  const base = BASES[entorno + '|' + Boolean(verifactu)];
  const partes = [
    ['nif', validarNif(nif)],
    ['numserie', formatearNumserie(numserie)],
    ['fecha', formatearFecha(fecha)],
    ['importe', formatearImporte(importe)],
  ];
  return base + '?' + partes.map(([k, v]) => k + '=' + urlencode(v)).join('&');
}

/** Añade formato=json para consultar el servicio y parsear la respuesta. Nunca va dentro del QR. */
export function urlConsultaJson(urlQr) {
  if (urlQr.includes('formato=')) return urlQr;
  return urlQr + (urlQr.includes('?') ? '&' : '?') + 'formato=json';
}
