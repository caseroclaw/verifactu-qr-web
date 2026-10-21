/**
 * Fuente única de las preguntas frecuentes.
 *
 * `tools/build-faq.js` genera de aquí (1) la sección visible de index.html y
 * (2) el `FAQPage` del JSON-LD, para que el texto estructurado y el texto que
 * ve el usuario sean idénticos palabra por palabra. La guía de Google exige que
 * la respuesta marcada exista en la página; tener dos copias divergentes era un
 * defecto real de la versión 1.0.
 *
 * `tests/faq-parity.test.js` falla si ambas copias se separan.
 */
export const faq = [
  {
    q: '¿Qué tiene que contener el QR de una factura con VeriFactu?',
    a: 'El QR debe codificar una URL con cuatro parámetros: nif (NIF, NIE o CIF del emisor), numserie (número de serie de la factura, hasta 60 caracteres ASCII imprimibles), fecha (fecha de expedición en formato DD-MM-AAAA) e importe (importe total en euros, con hasta 12 dígitos de parte entera y 2 decimales). El parámetro formato=json nunca se incluye dentro del QR: solo se añade a la URL de consulta para recibir la respuesta del servicio de cotejo en JSON.',
  },
  {
    q: '¿Cuándo es obligatorio el QR de VeriFactu para las pymes españolas?',
    a: 'El Real Decreto 1007/2023, modificado por el Real Decreto 254/2025, escalona la obligación: 1 de enero de 2027 para los obligados del Impuesto sobre Sociedades y 1 de julio de 2027 para autónomos y el resto de obligados tributarios. Los fabricantes de software de facturación quedaron obligados antes, el 29 de julio de 2025, así que cualquier programa que se venda hoy ya debe generar el QR. Los territorios forales (País Vasco y Navarra) se rigen por TicketBAI y Batuz, no por este reglamento.',
  },
  {
    q: '¿Esta herramienta envía los datos de mi factura a algún servidor?',
    a: 'No. La página no tiene backend, no usa cookies de seguimiento y no hace ninguna petición de red: la URL y el QR se calculan íntegramente en el navegador. Puedes guardarla y usarla sin conexión una vez cargada, y comprobarlo en las herramientas de desarrollo del navegador o en el código fuente, que es público y tiene licencia MIT.',
  },
  {
    q: '¿Cómo se codifican los caracteres especiales en la URL del QR?',
    a: 'La AEAT exige la misma codificación que java.net.URLEncoder con UTF-8: los caracteres seguros (letras, dígitos, guion, punto, asterisco y guion bajo) se mantienen, el espacio se convierte en el signo más (+) y el resto se codifica byte a byte en hexadecimal con porcentaje (%XX). Por eso un número de serie como 12345678&G33 aparece en la URL como numserie=12345678%26G33. Usar encodeURIComponent de JavaScript en su lugar es la causa más frecuente de que un QR parezca correcto y el servicio de cotejo lo rechace.',
  },
  {
    q: '¿Qué significan los errores 2001 a 2006 que devuelve la AEAT?',
    a: 'Son los códigos con los que el servicio de cotejo rechaza los datos del QR: 2001, el NIF tiene un formato erróneo o el dígito de control no es válido; 2002, el número de serie está vacío o excede los 60 caracteres; 2003, el número de serie contiene caracteres fuera del rango ASCII imprimible (32 a 126); 2004, la fecha no tiene el formato DD-MM-AAAA o no es una fecha real; 2005, el importe tiene un formato incorrecto o más de dos decimales; 2006, el importe excede los 12 dígitos de parte entera.',
  },
  {
    q: '¿La herramienta sirve también para facturas que no están en VERI*FACTU?',
    a: 'Sí. El sistema VERI*FACTU y el modo no VERI*FACTU usan rutas de cotejo distintas (ValidarQR y ValidarQRNoVerifactu), igual que los entornos de producción y de pruebas. El selector de la herramienta cubre las cuatro combinaciones, de modo que puedes comprobar el QR tanto en preproducción como en producción, y tanto si tu software remite los registros a la AEAT como si solo los conserva firmados y encadenados.',
  },
  {
    q: '¿El QR que genera esta herramienta basta para cumplir con VeriFactu?',
    a: 'No, y conviene decirlo claro: esta herramienta genera la URL y la imagen del QR, que es la parte visible de la obligación, pero no es un sistema informático de facturación. Cumplir VeriFactu exige un programa que emita la factura, genere un registro de alta con huella y encadenamiento, lo conserve y permita remitirlo a la AEAT. Para eso hace falta un software adaptado o la aplicación gratuita de la Agencia Tributaria. Lo que sí hace esta página es verificar que la URL que codifica tu QR es exactamente la que espera el servicio de cotejo, que es donde fallan la mayoría de las incidencias.',
  },
  {
    q: '¿Puedo generar el QR de muchas facturas o integrarlo en mi propio sistema?',
    a: 'La página genera una factura cada vez, a propósito: el QR se calcula en el navegador y no se guarda ningún histórico. Para lotes o para integrarlo en un ERP hay dos vías del mismo proyecto: la librería de Python con línea de comandos, que acepta los cuatro datos y devuelve la URL, y el servidor MCP, que expone las mismas funciones a un agente de IA o a un asistente. Las dos son gratuitas, sin dependencias y con la misma validación de NIF y los mismos códigos de error que la web.',
  },
];
