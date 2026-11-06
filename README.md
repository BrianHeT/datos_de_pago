# Páginas de pago por alias (QR + NFC)

Sitio estático para GitHub Pages. El cliente escanea un QR o acerca el celular a una etiqueta NFC, se abre la página del vendedor, copia el alias o el CVU y transfiere desde su propia app. No hay backend ni base de datos, y no se cobra comisión.

## Estructura

```
pagos/
├── index.html     ← página raíz neutra (no muestra datos)
├── app.js         ← lógica común + configuración de GoatCounter
├── estilos.css    ← diseño común (claro/oscuro automático)
├── .gitignore
├── v1/
│   ├── index.html ← página del vendedor 1 (igual para todos, cambia solo data-vendedor)
│   └── datos.js   ← datos de transferencia SOLO del vendedor 1
└── v2/
    ├── index.html
    └── datos.js
```

Cada página descarga únicamente su propio `datos.js`. **Esto es orden, no privacidad:** todo lo publicado en GitHub Pages es público, y cualquiera puede abrir `/pagos/v2/datos.js` directamente.

## Modificar los datos de transferencia

Editar `vX/datos.js`:

```js
window.VENDEDOR = Object.freeze({
  id: "v1",                 // = nombre de la carpeta = data-vendedor del index.html
  nombre: "Nombre del Local",
  titular: "Nombre Apellido",
  alias: "MI.ALIAS",        // 6 a 20 caracteres: letras, números, punto y guion
  cvu: "0000003100000000000001", // exactamente 22 dígitos
});
```

Si un dato no tiene formato válido o el `id` no coincide con la carpeta, la página muestra "Este enlace no está disponible" y no muestra ningún dato. Es a propósito: mejor ningún alias que uno equivocado. El motivo del error aparece en la consola del navegador.

## Agregar un vendedor

1. Copiar la carpeta `v2` como `v3`.
2. En `v3/index.html`, cambiar `data-vendedor="v2"` por `data-vendedor="v3"`.
3. En `v3/datos.js`, cambiar `id: "v2"` por `id: "v3"` y cargar sus datos.
4. Abrir `.../pagos/v3/` y comprobar que aparecen sus datos y no los de otro.

## Qué se publica y qué no

**Se publica (lo mínimo para transferir):** nombre del comercio, titular, alias y CVU.

**No incluir nunca en el repo:** CUIT, DNI, teléfono, dirección, email, números de tarjeta, claves, tokens de Mercado Pago o de cualquier API, capturas de comprobantes ni notas privadas. El `.gitignore` excluye `.env`, `secretos/`, `privado/`, `borradores/` y similares, pero **lo más seguro es no guardar esas cosas en la carpeta del proyecto.**

Ojo: ocultar, minificar u ofuscar el JS, o hacer el repo privado, **no protege** los datos que necesita el navegador. Si la página los muestra, cualquiera puede verlos.

Si alguna vez subiste un dato que no correspondía (por ejemplo el CUIT de una versión anterior), sigue en el **historial de git** aunque lo borres del archivo. Para sacarlo hay que reescribir el historial (`git filter-repo`) o borrar el repo y crear uno nuevo.

## Contador de visitas (GoatCounter)

1. Crear cuenta en https://www.goatcounter.com y elegir un código (por ejemplo `pagostehe`).
2. En `app.js`, poner ese código en `var GOATCOUNTER_CODE = "pagostehe";`.

Usa el modo "pixel" de GoatCounter: una imagen 1×1 a `https://CODIGO.goatcounter.com/count`, **sin cargar scripts de terceros**. No usa cookies y no envía alias, CVU ni datos del cliente. GoatCounter recibe la IP y el navegador del visitante (como cualquier servidor web) y no guarda identificadores personales.

| Ruta en GoatCounter | Significa |
|---|---|
| `/v1/qr` | visita desde el QR del vendedor 1 |
| `/v1/nfc` | visita desde la etiqueta NFC |
| `/v1/directo` | sin `src` o con un `src` desconocido |
| `copiar-alias-v1-qr` | evento: **copió con éxito** el alias después de entrar por QR |
| `copiar-cvu-v1-nfc` | evento: **copió con éxito** el CVU después de entrar por NFC |

Solo `qr` y `nfc` se aceptan como `src`. Cualquier otro valor cuenta como `directo`, así nadie puede llenar tus estadísticas con rutas inventadas desde la URL. Los eventos de copia se registran **solo si la copia funcionó**. La página no puede saber si la transferencia se hizo.

**Para no contar tus propias pruebas:** abrí una vez `.../pagos/v1/#no-contar` en tu celular (queda guardado en ese navegador). Para volver a contar: `#contar`.

## Generar los códigos QR

| Vendedor | URL del QR | URL del NFC |
|---|---|---|
| v1 | `https://USUARIO.github.io/pagos/v1/?src=qr` | `https://USUARIO.github.io/pagos/v1/?src=nfc` |
| v2 | `https://USUARIO.github.io/pagos/v2/?src=qr` | `https://USUARIO.github.io/pagos/v2/?src=nfc` |

Con `qrencode` (Linux/macOS, sin cuenta ni web de terceros):

```bash
qrencode -t SVG -l M -m 2 -o v1-qr.svg "https://USUARIO.github.io/pagos/v1/?src=qr"
qrencode -t PNG -l M -s 20 -m 2 -o v1-qr.png "https://USUARIO.github.io/pagos/v1/?src=qr"
```

- Nivel de corrección `M` alcanza. Impresión de 3×3 cm como mínimo, sin plastificado brillante.
- Si usás un generador web, que sea uno de **QR estático** (la URL va dentro del código). Los "QR dinámicos" redirigen por un servidor ajeno que puede cobrar, caducar o cambiar el destino.
- Antes de imprimir, escaneá el QR y comprobá que abre la URL exacta.

## Programar las etiquetas NTAG213 (NFC Tools)

1. NFC Tools → **Escribir** → **Agregar un registro** → **URL/URI**.
2. Pegar la URL con `?src=nfc` del vendedor.
3. **Escribir** y acercar la etiqueta.
4. Probar que abre la página correcta.
5. **Otros → Bloquear etiqueta** (solo lectura). Es **irreversible**: verificá bien antes.

Capacidad: la NTAG213 tiene 144 bytes. Con `https://` comprimido, la URL de una página entra si mide hasta unos 136 caracteres (sin contar `https://`). Las URLs de este proyecto ocupan entre 39 y 75 bytes según el largo del usuario de GitHub, así que entran de sobra.

En iPhone, la lectura NFC funciona con el teléfono desbloqueado y en modelos XS o posteriores.

## Publicar cambios en GitHub Pages

1. Subir los cambios (`git add . && git commit -m "..." && git push`).
2. Primera vez: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`**.
3. En **Settings → Pages**, marcar **Enforce HTTPS**.
4. Esperar 1–2 minutos y probar las 4 URLs desde el celular.

## Proteger el proyecto

- **2FA en GitHub** (Settings → Password and authentication), con app autenticadora o llave de seguridad, no SMS. Guardá los códigos de recuperación. Quien controle tu cuenta puede cambiar el alias de todas las páginas.
- Revisá de vez en cuando las **sesiones activas** y los **tokens/llaves SSH** de tu cuenta.
- Si conectás un dominio propio, verificalo en GitHub (Settings → Pages → Verified domains) para que nadie pueda tomarlo.

### Riesgo: QR o etiqueta reemplazados

La página no puede impedir que alguien pegue **otro QR encima** o deje otra etiqueta NFC al lado, apuntando a una copia con su alias. Para reducirlo:

- Que el cartel tenga también **el alias y el titular impresos**: el cliente puede comparar con lo que ve en pantalla.
- La advertencia de la página pide verificar el titular en la app antes de confirmar, y esa es la defensa principal.
- Revisar el cartel de vez en cuando, y bloquear las etiquetas NFC como solo lectura.
- Plastificar o poner el QR detrás de un acrílico hace más difícil taparlo sin que se note.

## Seguridad del código (resumen)

- Los datos se insertan con `textContent` / `createTextNode`, nunca con `innerHTML`.
- `src` se valida contra una lista blanca (`qr`, `nfc`).
- Content-Security-Policy por `<meta>`: solo scripts y estilos propios, imágenes propias y de `*.goatcounter.com`. Si algún día agregás un script externo, hay que sumarlo ahí.
- Sin dependencias externas: no se carga ningún JS de terceros.
