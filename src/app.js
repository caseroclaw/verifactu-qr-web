/**
 * Interfaz web: lee el formulario, valida los cuatro datos, construye la URL del
 * QR tributario y lo dibuja. Todo en el navegador: sin red, sin cookies, sin
 * almacenamiento y sin backend.
 */
import {
  buildQrUrl,
  formatearFecha,
  formatearImporte,
  formatearNumserie,
  tipoNif,
  validarNif,
  urlConsultaJson,
  QRError,
} from './verifactu.js';

const $ = (id) => document.getElementById(id);
const form = $('form');
const CAMPOS = ['nif', 'numserie', 'fecha', 'importe'];

function leerCampos() {
  return {
    nif: $('nif').value,
    numserie: $('numserie').value,
    fecha: $('fecha').value,
    importe: $('importe').value,
    entorno: $('entorno').value,
    verifactu: $('verifactu').value === 'true',
  };
}

/** Valida los cuatro datos a la vez y devuelve los errores con su código AEAT. */
function validarCampos(campos) {
  const errores = [];
  const valor = {};
  const comprobar = (clave, fn, entrada) => {
    try {
      valor[clave] = fn(entrada);
    } catch (e) {
      if (e instanceof QRError) errores.push(e);
      else errores.push(new QRError(2000, String(e && e.message ? e.message : e)));
    }
  };
  comprobar('nif', validarNif, campos.nif);
  comprobar('numserie', formatearNumserie, campos.numserie);
  comprobar('fecha', formatearFecha, campos.fecha);
  comprobar('importe', formatearImporte, campos.importe);
  return { errores, valor };
}

function pintarErrores(errores) {
  const caja = $('errores');
  const lista = $('lista-errores');
  lista.textContent = '';
  for (const error of errores) {
    const li = document.createElement('li');
    li.textContent = error.message;
    lista.appendChild(li);
  }
  caja.hidden = errores.length === 0;
}

let qrActual = null;

function pintarQr(url) {
  const contenedor = $('qr');
  contenedor.textContent = '';
  qrActual = null;
  try {
    const qr = qrcode(0, 'M'); // versión automática, corrección M (estándar en facturación)
    qr.addData(url);
    qr.make();
    const img = document.createElement('img');
    img.width = 180;
    img.height = 180;
    img.alt = 'Código QR tributario de la factura (VeriFactu)';
    img.src = qr.createDataURL(5, 10);
    contenedor.appendChild(img);
    qrActual = qr;
  } catch (e) {
    contenedor.textContent = 'No se ha podido dibujar el QR: ' + e.message;
  }
}

function generar() {
  const campos = leerCampos();
  const { errores, valor } = validarCampos(campos);
  pintarErrores(errores);

  if (errores.length) {
    $('salida').hidden = true;
    $('url').value = '';
    $('qr').textContent = '';
    $('pista').textContent = '';
    $('abrir').removeAttribute('href');
    qrActual = null;
    return;
  }

  const url = buildQrUrl(valor.nif, valor.numserie, valor.fecha, valor.importe, {
    verifactu: campos.verifactu,
    entorno: campos.entorno,
  });

  $('salida').hidden = false;
  $('url').value = url;
  $('abrir').href = urlConsultaJson(url);
  $('pista').textContent =
    'Tipo de identificación: ' + tipoNif(valor.nif) + ' · importe normalizado ' + valor.importe +
    ' € · ' + (campos.verifactu ? 'VERI*FACTU' : 'No VERI*FACTU') + ' · entorno ' + campos.entorno +
    ' · longitud de la URL: ' + url.length + ' caracteres';
  pintarQr(url);
}

form.addEventListener('submit', (evento) => {
  evento.preventDefault();
  generar();
});

for (const id of [...CAMPOS, 'entorno', 'verifactu']) {
  $(id).addEventListener('input', generar);
  $(id).addEventListener('change', generar);
}

$('ejemplo').addEventListener('click', () => {
  const ejemplo = { nif: '89890001K', numserie: '12345678&G33', fecha: '01-01-2024', importe: '241,40' };
  for (const [id, texto] of Object.entries(ejemplo)) $(id).value = texto;
  $('entorno').value = 'produccion';
  $('verifactu').value = 'true';
  generar();
});

$('limpiar').addEventListener('click', () => {
  for (const id of CAMPOS) $(id).value = '';
  $('salida').hidden = true;
  pintarErrores([]);
});

$('copiar').addEventListener('click', async () => {
  const boton = $('copiar');
  try {
    await navigator.clipboard.writeText($('url').value);
    boton.textContent = 'Copiada';
  } catch {
    $('url').select();
    boton.textContent = 'Selecciónala y copia';
  }
  setTimeout(() => { boton.textContent = 'Copiar URL'; }, 2000);
});

$('svg').addEventListener('click', () => {
  if (!qrActual) return;
  const svg = qrActual.createSvgTag({ cellSize: 4, margin: 4, scalable: true });
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(blob);
  enlace.download = 'verifactu-qr.svg';
  enlace.click();
  URL.revokeObjectURL(enlace.href);
});

generar();
