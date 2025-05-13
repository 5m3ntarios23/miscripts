var spamVroom = 666;  
var generalVroom = 0;  
// Ahora es un array, no un string  
var blockedAS = [  
    "AS265540 ALTAN REDES, S.A.P.I. de C. V.",  
    "Television Internacional, S.A. de C.V.",
    "AS265594 Television Internacional, S.A. de C.V.",
    "AS8151 UNINET"  
];  
var appealCodes = {}; // Para almacenar códigos de apelación  
var approvedUsers = {}; // Para almacenar usuarios aprobados  
var approvedIPs = {}; // Para almacenar IPs aprobadas  

var approvedIPsFile = "approved_ips.json";  

function generateAppealCode() {  
    return Math.random().toString(36).substring(2, 8).toUpperCase();  
}  

function loadApprovedIPs() {  
    if (File.exists(approvedIPsFile)) {  
        try {  
            approvedIPs = JSON.parse(File.load(approvedIPsFile));  
            print("[SISTEMA] Lista de IPs aprobadas cargada correctamente");  
        } catch (e) {  
            print("[ERROR] Error al cargar la lista de IPs aprobadas: " + e);  
            approvedIPs = {};  
        }  
    } else {  
        print("[SISTEMA] No existe archivo de IPs aprobadas, se creará uno nuevo");  
        approvedIPs = {};  
        saveApprovedIPs();  
    }  
}  

function saveApprovedIPs() {  
    try {  
        File.save(approvedIPsFile, JSON.stringify(approvedIPs));  
        print("[SISTEMA] Lista de IPs aprobadas guardada correctamente");  
    } catch (e) {  
        print("[ERROR] Error al guardar la lista de IPs aprobadas: " + e);  
    }  
}  

function onCommand(userobj, command, target, args) {  
    var parts = command.split(" ");  
    if (userobj.level >= 2 && parts[0] === "approve") {  
        var code = parts[1];  
        if (!code) {  
            print(userobj, "[ERROR] Uso correcto: /approve CÓDIGO");  
            return true;  
        }  
        print(userobj, "Intentando aprobar código: " + code);  
        if (appealCodes[code]) {  
            var username = appealCodes[code];  
            approvedUsers[username] = true;  
            for (var i = 0; i < 1000; i++) {  
                var u = user(i);  
                if (u && u.name === username && u.visible) {  
                    var ipValida = obtenerIpValida(u);  
                    approvedIPs[ipValida] = username;  
                    saveApprovedIPs();  
                    u.vroom = generalVroom;  
                    print("[SISTEMA] Usuario " + username + " aprobado por " + userobj.name);  
                    print("[SISTEMA] IP " + ipValida + " añadida a la lista de excepciones");  
                    break;  
                }  
            }  
            delete appealCodes[code];  
        } else {  
            print(userobj, "[ERROR] Código de apelación inválido");  
            print("Códigos válidos: " + Object.keys(appealCodes).join(", "));  
        }  
        return true;  
    }  
    return false;  
}  

function onEmoteBefore(userobj, text) {  
    if (userobj.level >= 2) return text;  
    return userobj.vroom === spamVroom ? "" : text;  
}  

function obtenerIpValida(userobj) {  
    if (userobj.version === "Ares_2.3.1.3055" || userobj.version === "cb0t 3.39") {  
        return userobj.externalIp;  
    }  
    var localIp = userobj.localIp;  
    return esIpLocal(localIp) ? userobj.externalIp : localIp;  
}  

function esIpLocal(ip) {  
    return /^(127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01]))/.test(ip);  
}  

function moveUserToProxyRoom(userobj) {  
    if (approvedUsers[userobj.name]) return;  
    userobj.originalVroom = userobj.vroom;  
    userobj.vroom = spamVroom;  
    var appealCode = generateAppealCode();  
    appealCodes[appealCode] = userobj.name;  

    print("🚫 " + userobj.name + " ha sido excluído de la sala por uso de VPN/Proxy");  
    print(userobj, "📜 " + userobj.name + ", un administrador puede aprobar tu ingreso.");  
    print(userobj, "📜 Tu código de aprobación es: " + appealCode);  
    print(userobj, "📜 Por favor aguarda aquí hasta su aprobación.");  

    for (var i = 0; i < 1000; i++) {  
        var u = user(i);  
        if (u && u.level >= 2 && u.visible) {  
            print(u, "[ADMIN] Uso: /approve " + appealCode);  
        }  
    }  
}  

function onVroomJoinCheck(userobj, vroom) {  
    if (approvedUsers[userobj.name]) return true;  
    return userobj.vroom !== spamVroom;  
}  

function onJoin(userobj) {  
    if (userobj.level > 0) return;  
    var ipValida = obtenerIpValida(userobj);  

    if (approvedIPs[ipValida]) {  
        approvedUsers[userobj.name] = true;  
        print("[SISTEMA] Usuario " + userobj.name + " reconocido automáticamente por IP aprobada");  
        return;  
    }  

    var url = "http://ip-api.com/json/" + ipValida +  
              "?fields=status,message,proxy,hosting,isp,as";  
    var http = new HttpRequest();  
    http.src = url;  

http.oncomplete = function(e) {  
    if (!e) return;  
    try {  
 //       print("[DEBUG] Respuesta cruda: " + this.page);  
        var resp = JSON.parse(this.page);  
        if (resp.status === "fail") {  
            print("[ERROR] ip‑api dice: " + resp.message);  
            return;  
        }  

        // <-- Aquí cambiamos includes() por indexOf() !== -1  
        var isBlockedAS = blockedAS.indexOf(resp.as) !== -1;  
        if (resp.proxy || resp.hosting || isBlockedAS) {  
            if (approvedUsers[userobj.name]) return;  

            if (isBlockedAS) {  
                print("⚠️ AS Bloqueado: " + resp.as);  
            } else {  
                print("⚠️ Proxy/VPN detectado - ISP: " + resp.isp);  
            }  
            moveUserToProxyRoom(userobj);  

        } else if (userobj.vroom === spamVroom && userobj.originalVroom) {  
            userobj.vroom = userobj.originalVroom;  
            print(userobj.name + ": Has sido movido de vuelta a la sala " + userobj.vroom + ".");  
            delete userobj.originalVroom;  
        }  
    } catch (err) {  
        print("[ERROR] Falló JSON.parse:");  
        print("[ERROR] " + err);  
    }  
};   

    http.download();  
}  

function onLoad() {  
    loadApprovedIPs();  
    print("=== DETECTOR DE PROXY/VPN ACTIVADO ===");  
    print("Los usuarios con VPN/Proxy serán excluídos de la sala");  
    print("Sistema de excepciones por IP activado");  
}  
