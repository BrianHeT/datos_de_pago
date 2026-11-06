(function () {
  "use strict";

  // =====================================================
  //  CONFIGURACIÓN
  //  Código de tu cuenta de GoatCounter (lo que va antes de .goatcounter.com).
  //  Dejalo vacío ("") para desactivar el contador.
  // =====================================================
  var GOATCOUNTER_CODE = "";

  // Orígenes válidos del parámetro ?src= (cualquier otro valor cuenta como "directo")
  var ORIGENES = ["qr", "nfc"];

  var id = document.body.getAttribute("data-vendedor") || "";
  var v = window.VENDEDOR;
  var params = new URLSearchParams(location.search);
  var src = ORIGENES.indexOf(params.get("src")) !== -1 ? params.get("src") : "directo";

  function mostrarError(msg) {
    var app = document.getElementById("app");
    var p = document.createElement("p");
    p.className = "error";
    p.textContent = msg;
    app.replaceChildren(p);
  }

  // Validación: si algo no cierra, no se muestra ningún dato (mejor nada que un alias equivocado)
  var valido =
    /^[a-z0-9-]{1,20}$/.test(id) &&
    v && typeof v === "object" &&
    v.id === id &&
    typeof v.nombre === "string" && v.nombre &&
    typeof v.titular === "string" && v.titular &&
    /^[A-Za-z0-9.-]{6,20}$/.test(v.alias) &&
    /^\d{22}$/.test(v.cvu);

  if (!valido) {
    mostrarError("Este enlace no está disponible.");
    if (window.console) console.error("[pagos] Datos del vendedor ausentes o inválidos para '" + id + "'. Revisá " + id + "/datos.js");
    return;
  }

  function setText(sel, txt) {
    var el = document.querySelector(sel);
    if (el) el.textContent = txt;
  }
  document.title = "Pagar a " + v.nombre;
  setText("[data-campo=nombre]", v.nombre);
  setText("[data-campo=titular]", v.titular);
  // Alias: permite cortar línea solo después de los puntos (con <wbr>, sin caracteres invisibles)
  var aliasEl = document.querySelector("[data-campo=alias]");
  v.alias.split(".").forEach(function (parte, i, arr) {
    aliasEl.appendChild(document.createTextNode(parte + (i < arr.length - 1 ? "." : "")));
    if (i < arr.length - 1) aliasEl.appendChild(document.createElement("wbr"));
  });
  setText("[data-campo=cvu]", v.cvu);

  // ---------- Contador (GoatCounter, modo "pixel", sin scripts de terceros) ----------
  // Se manda una imagen 1x1 a https://CODIGO.goatcounter.com/count con:
  //   p = ruta o nombre del evento, t = título, e = true si es evento.
  // No se envían cookies, ni el alias/CVU, ni datos del cliente.
  var NO_CONTAR_KEY = "pagos-no-contar";

  function contadorActivo() {
    if (!/^[a-z0-9-]{1,40}$/.test(GOATCOUNTER_CODE)) return false;
    try {
      // Visitar cualquier página con #no-contar desactiva el contador en ESTE navegador
      // (para no inflar las estadísticas con tus pruebas). #contar lo vuelve a activar.
      if (location.hash === "#no-contar") localStorage.setItem(NO_CONTAR_KEY, "1");
      if (location.hash === "#contar") localStorage.removeItem(NO_CONTAR_KEY);
      if (localStorage.getItem(NO_CONTAR_KEY) === "1") return false;
    } catch (e) { /* localStorage bloqueado: se cuenta igual */ }
    return true;
  }

  var contar = contadorActivo();

  function gcSend(path, title, esEvento) {
    if (!contar) return;
    var q = new URLSearchParams();
    q.set("p", path);
    q.set("t", title);
    if (esEvento) q.set("e", "true");
    if (navigator.webdriver) q.set("b", "153"); // navegador automatizado: marcar como bot
    q.set("rnd", Math.random().toString(36).slice(2));
    var img = new Image();
    img.referrerPolicy = "no-referrer";
    img.src = "https://" + GOATCOUNTER_CODE + ".goatcounter.com/count?" + q.toString();
  }

  // Visita: queda registrada como /v1/qr, /v1/nfc o /v1/directo
  gcSend("/" + id + "/" + src, v.nombre + " (" + src + ")", false);

  // ---------- Copiar ----------
  var toast = document.getElementById("toast");
  var toastTimer;

  function mostrarToast(msg) {
    toast.textContent = msg;
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("visible"); }, 2200);
  }

  // Fallback para navegadores sin Clipboard API (o que la rechazan).
  // En iOS hace falta setSelectionRange y que el textarea no sea readonly.
  function copiarFallback(texto) {
    var ta = document.createElement("textarea");
    ta.value = texto;
    ta.setAttribute("aria-hidden", "true");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    ta.style.fontSize = "16px"; // evita el zoom automático de iOS
    document.body.appendChild(ta);
    var ok = false;
    try {
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, texto.length);
      ok = document.execCommand("copy") === true;
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }

  function copiar(texto) {
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      return navigator.clipboard.writeText(texto).then(
        function () { return true; },
        function () { return copiarFallback(texto); }
      );
    }
    return Promise.resolve(copiarFallback(texto));
  }

  // Si no se pudo copiar, deja el texto seleccionado en pantalla para copiarlo a mano
  function seleccionarTexto(campo) {
    var el = document.querySelector("[data-campo=" + campo + "]");
    if (!el || !window.getSelection) return;
    try {
      var rango = document.createRange();
      rango.selectNodeContents(el);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(rango);
    } catch (e) { /* sin selección, queda el mensaje */ }
  }

  var CAMPOS_COPIABLES = { alias: "Alias", cvu: "CVU" };

  document.querySelectorAll("[data-copiar]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var campo = btn.getAttribute("data-copiar");
      if (!CAMPOS_COPIABLES.hasOwnProperty(campo)) return;
      var texto = v[campo];
      copiar(texto).then(function (ok) {
        if (ok) {
          mostrarToast(CAMPOS_COPIABLES[campo] + " copiado ✓");
          btn.classList.add("copiado");
          setTimeout(function () { btn.classList.remove("copiado"); }, 1500);
          // Solo se registra cuando la copia funcionó
          gcSend("copiar-" + campo + "-" + id + "-" + src, "Copiar " + campo + " — " + v.nombre, true);
        } else {
          seleccionarTexto(campo);
          mostrarToast("No se pudo copiar. Quedó seleccionado: mantené apretado y elegí Copiar");
        }
      });
    });
  });
})();
