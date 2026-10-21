# VeriFactu QR — herramienta web gratuita

Generador de la **URL del servicio de cotejo** y del **código QR tributario** que exige el Reglamento VeriFactu (RD 1007/2023 y Orden HAC/1177/2024) para las facturas emitidas con un sistema de facturación adaptado.

**Úsala en el navegador: https://caseroclaw.github.io/verifactu-qr-web/**

- Sin registro, sin backend, sin cookies y sin peticiones de red: todo se calcula en tu equipo.
- Cubre las **cuatro bases** del servicio de cotejo (producción/pruebas × VERI*FACTU/no VERI*FACTU).
- Valida el **dígito de control de NIF, NIE y CIF** y replica los **códigos de error 2001-2006** de la AEAT.
- Aplica el mismo **URL encoding que `java.net.URLEncoder`** (espacio → `+`, resto → `%XX`).
- Copia la URL, abre la consulta con `formato=json` o descarga el QR en **SVG** para imprimirlo.

Herramienta gratuita de **[Plataforma IA](https://plataformaia.com/)**, consultora de automatización con IA para pymes en España (Madrid): automatizamos procesos como la emisión y conciliación de facturas, los cobros y el back-office, y formamos a los equipos para hacerlo con criterio.

## Por qué existe

El QR de una factura con VeriFactu no contiene XML ni firma: codifica una URL con cuatro parámetros (`nif`, `numserie`, `fecha` en DD-MM-AAAA e `importe`). El parámetro `formato=json` solo se usa para consultar el servicio de cotejo y **nunca va dentro del QR**. Muchos programas de facturación ya lo generan, pero no es fácil comprobar si la URL es exactamente la que espera la AEAT; esta herramienta sirve para verificarlo (y para entender la especificación).

Fechas clave de la obligación: **1 de enero de 2027** para obligados del Impuesto sobre Sociedades y **1 de julio de 2027** para autónomos y el resto de obligados (los fabricantes de software ya están obligados desde el 29 de julio de 2025). Guía en el blog: [VeriFactu 2027 para pymes: fechas y preparación](https://plataformaia.com/es/blog/verifactu-2027-pymes-fechas-preparacion).

## Uso

1. Abre la página (o clónala y ábrela en local: no necesita servidor).
2. Introduce NIF del emisor, número de serie, fecha (DD-MM-AAAA) e importe total.
3. Elige entorno (producción/pruebas) y sistema (VERI*FACTU/no VERI*FACTU).
4. Copia la URL, descarga el QR en SVG o pulsa «Consultar en la AEAT».

Ejemplo oficial: NIF `89890001K`, serie `12345678&G33`, fecha `01-01-2024`, importe `241,40` produce
`https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR?nif=89890001K&numserie=12345678%26G33&fecha=01-01-2024&importe=241.4`.

## Contenido del repositorio

- `src/faq.js` — fuente única de las preguntas frecuentes. `node tools/build-faq.js` genera de aquí la sección visible **y** el `FAQPage` del JSON-LD, y `tests/faq-parity.test.js` falla si ambas copias se separan aunque sea un carácter.
- `index.html` — página con el formulario, la explicación normativa, las FAQ, el bloque «para quién es / para quién no», la comparativa de vías para obtener el QR, la referencia citable y los datos estructurados (`SoftwareApplication` + `FAQPage`).
- `src/verifactu.js` — núcleo puro (URL, validaciones, códigos AEAT). Port fiel de la librería Python [`verifactu-qr`](https://github.com/caseroclaw/verifactu-qr).
- `src/app.js` — interfaz: lee el formulario, valida y dibuja el QR.
- `vendor/qrcode.js` — [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 1.4.4 (MIT), vendorizado sin modificar.
- `tests/` — 15+ pruebas: vector oficial de la AEAT, dígitos de control, códigos 2001-2006, **ida y vuelta del QR** (se genera y se vuelve a decodificar con jsQR) y comprobaciones de la página.

## Desarrollo

```bash
npm install         # dependencia de desarrollo: jsqr
npm test            # pruebas del núcleo, del QR y de la página
npm run check       # sintaxis + verificación de enlaces y recursos
python3 -m http.server 8000   # servidor local opcional (no hace falta: es estático)
```

## Relacionado

- [`verifactu-qr`](https://github.com/caseroclaw/verifactu-qr) — librería Python + CLI + servidor MCP.
- [`verifactu-qr-extension`](https://github.com/caseroclaw/verifactu-qr-extension) — extensión para Edge, Chrome y Firefox.

## Licencia

MIT. Herramienta no oficial: la referencia normativa es la sede electrónica de la AEAT.

Componentes de terceros: `vendor/qrcode.js` es *QR Code Generator for JavaScript* (qrcode-generator 1.4.4), © 2009 Kazuhiko Arase, licencia MIT, vendorizado sin modificar.

---

## English

Free web tool that generates the Spanish **VeriFactu tax QR** URL and QR image (Royal Decree 1007/2023, Order HAC/1177/2024). Enter the issuer NIF, invoice series number, issue date and total amount; the page returns the exact AEAT verification URL, validates NIF/NIE/CIF check digits, replicates AEAT error codes 2001-2006 and lets you download the QR as SVG. No backend, no tracking, no network requests. Built by [Plataforma IA](https://plataformaia.com/), an AI automation consultancy for SMBs in Spain.
