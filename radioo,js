// Variables globales  
var contadorIntervalo       = 0;  
var intervaloActualizacion  = 12;  
var ultimaInfoRadio         = null;  
var ultimoTitulo            = "";  
var ultimoMensajeFueSistema = false;  
var ultimoMensajeChat       = "";  
var fueAnuncioRadio         = false;  
var mostrarSoloConOyentes   = true; // true = sólo con oyentes  

// Decodifica percent-encodings, normaliza y corrige "Ã±", "Ã¡", etc.  
function decodificarTexto(texto) {  
  if (typeof texto !== 'string' || !texto) return "";  
  var t = texto;  
  try { t = decodeURIComponent(escape(t)); } catch (_) {}  
  if (t.normalize) t = t.normalize('NFC');  
  var rep = {  
    "Ã±":"ñ","Ã‘":"Ñ","Ã¡":"á","Ã©":"é","Ã­":"í",  
    "Ã³":"ó","Ãº":"ú","Ã":"Á","Ã‰":"É","Ã":"Í",  
    "Ã“":"Ó","Ãš":"Ú","â":"'", "â":"–",  
    "Á‘":"Ñ","á‘":"ñ"  
  };  
  Object.keys(rep).forEach(function(k){  
    t = t.split(k).join(rep[k]);  
  });  
  t = t.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F]+/g, "");  
  return t.replace(/\s+/g, " ").trim();  
}  

// Capitaliza cada palabra  
function capitalizarCadaPalabra(texto) {  
  if (!texto) return "";  
  return texto.split(' ').map(function(p){  
    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();  
  }).join(' ');  
}  

// Pide JSON al servidor  
function actualizarInfoRadio() {  
  obtenerInfoDesdeStatus(  
    "https://azuracast.myautodj.com/listen/radio_mix_507/status-json.xsl"  
  );  
}  
function obtenerInfoDesdeStatus(url) {  
  if (!url) return print("URL inválida");  
  var http = new HttpRequest();  
  http.src     = url;  
  http.method  = "GET";  
  http.timeout = 30000;  
  http.oncomplete = function(){  
    var p = this.page && this.page.trim();  
    if (!p || !p.startsWith("{")) return print("Respuesta no válida");  
    try { procesarInfoRadio(JSON.parse(p)); }  
    catch(e){ print("JSON inválido: "+e); }  
  };  
  http.onerror = function(err){ print("Error HTTP: "+err); };  
  http.download();  
}  

// Solo si cambia el título  
function procesarInfoRadio(info) {  
  var src = info && info.icestats && info.icestats.source;  
  if (!src) return;  
  src = Array.isArray(src) ? src[0] : src;  
  var artista = decodificarTexto(src.artist||"");  
  var titulo  = decodificarTexto(src.title ||"");  
  var full    = artista && titulo ? artista + " - " + titulo : titulo;  
  var nuevo   = capitalizarCadaPalabra(full);  
  if (nuevo !== ultimoTitulo) {  
    ultimoTitulo    = nuevo;  
    ultimaInfoRadio = info;  
    mostrarInfoEnChat(info);  
  }  
}  

// Monta y envía el mensaje (con línea en blanco al final y un espacio)  
function mostrarInfoEnChat(info) {  
  var src = Array.isArray(info.icestats.source)  
            ? info.icestats.source[0]  
            : info.icestats.source;  
  if (!src) return;  
  if (mostrarSoloConOyentes && src.listeners <= 0) return;  

  var lines = [];  
  if (!fueAnuncioRadio || ultimoMensajeFueSistema) lines.push("");  
  lines.push("📻 Radio Mix 507  🎧 " + src.listeners);  
  var artista = decodificarTexto(src.artist || "");  
  var titulo  = decodificarTexto(src.title  || "");  
  var full    = capitalizarCadaPalabra(  
                  artista && titulo  
                    ? artista + " - " + titulo  
                    : titulo  
                );  
  lines.push("📀 " + full);  
  lines.push("📡 Emitiendo 24 Hrs");  
  lines.push("🌐 Escúchanos en https://radiomix507.com/");  
  // línea en blanco final  
  lines.push("");  

  // Unir con \n y limpiar controles excepto CR/LF  
  var msg = lines.join("\n")  
    .replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F]+/g, "");  

  fueAnuncioRadio = true;  
  ultimoMensajeFueSistema = false;  

  // prefijo de color negro (01), sufijo un ESPACIO en lugar de \x03  
  print("\x0301" + msg + " ");  
}  

// Eventos IRC  
function onTextReceived(user, text) {  
  ultimoMensajeChat = text;  
  if (!text.includes("📻 Radio Mix 507")) {  
    fueAnuncioRadio = false;  
    ultimoMensajeFueSistema = /ha entrado|has joined|ha salido|has parted/  
                             .test(text);  
  }  
}  
function onJoin() { ultimoMensajeFueSistema = true; }  
function onPart() { ultimoMensajeFueSistema = true; }  

function onLoad() {  
  print("Script de información de radio iniciado.");  
  actualizarInfoRadio();  
}  
function onTimer() {  
  contadorIntervalo++;  
  if (contadorIntervalo >= intervaloActualizacion) {  
    actualizarInfoRadio();  
    contadorIntervalo = 0;  
  }  
}  
function onCommand(user, command) {  
  if (!command) return false;  
  var cmd = command.toLowerCase();  
  if (cmd === "radio") {  
    ultimaInfoRadio  
      ? mostrarInfoEnChat(ultimaInfoRadio)  
      : actualizarInfoRadio();  
    return true;  
  }  
  if (cmd === "conoyentes") {  
    print("Filtro oyentes: " + (mostrarSoloConOyentes ? "ON" : "OFF"));  
    print("Uso: /conoyentes on | /conoyentes off");  
    return true;  
  }  
  if (cmd === "conoyentes on" || cmd === "conoyenteson") {  
    mostrarSoloConOyentes = true;  
    print("Filtro activado: sólo cuando hay oyentes.");  
    return true;  
  }  
  if (cmd === "conoyentes off" || cmd === "conoyentesoff") {  
    mostrarSoloConOyentes = false;  
    print("Filtro desactivado: siempre se muestran anuncios.");  
    return true;  
  }  
  return false;  
}
