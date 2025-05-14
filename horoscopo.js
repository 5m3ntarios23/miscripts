// Configuración global
var CONFIG = {
    API_BASE_URL: 'https://api.vedicastroapi.com/v3-json/prediction/daily-sun',
    API_KEY: '1e09751e-99a6-5818-a5d4-e0d654e241f7'
};

// Mapeo de signos zodiacales a números
var ZODIAC_MAP = {
    'aries': 1, 'tauro': 2, 'geminis': 3, 'cancer': 4, 'leo': 5, 'virgo': 6,
    'libra': 7, 'escorpio': 8, 'sagitario': 9, 'capricornio': 10, 'acuario': 11, 'piscis': 12
};

function onLoad() {
    print("Script de Horóscopo cargado exitosamente. Utiliza #horoscopo [signo] [fecha opcional] para consultar.");
}

function onCommand(userobj, command, target, args) {
    var fullCommand = command;
    command = command.split(/\s+/)[0].replace(/^[#\/]/, '');
    
    if (!args || args === "") {
        args = fullCommand.split(/\s+/).slice(1);
    } else if (typeof args === "string") {
        args = args.split(/\s+/);
    }

    if (command === "horoscopo") {
        if (args.length === 0) {
            print(userobj, "Uso: #horoscopo [signo] [fecha opcional en formato DD/MM/YYYY]");
            print(userobj, "Ejemplo: #horoscopo aries");
            print(userobj, "Ejemplo con fecha: #horoscopo aries 21/07/2024");
            return true;
        }

        var signo = args[0].toLowerCase();
        if (!ZODIAC_MAP[signo]) {
            print(userobj, "Signo no válido. Por favor, ingresa un signo del zodíaco válido.");
            return true;
        }

        var fecha = args[1] ? args[1] : formatDate(new Date());
        obtenerHoroscopo(userobj, signo, fecha);
        return true;
    }

    if (command === "ayuda") {
        print(userobj, "Comandos disponibles para el Horóscopo:");
        print(userobj, "#horoscopo [signo] [fecha opcional] - Obtiene el horóscopo para el signo y fecha especificados.");
        print(userobj, "Ejemplo: #horoscopo aries");
        print(userobj, "Ejemplo con fecha: #horoscopo aries 21/07/2024");
        return true;
    }

    return false;
}

function obtenerHoroscopo(userobj, signo, fecha) {
    var params = {
        zodiac: ZODIAC_MAP[signo],
        date: fecha,
        show_same: 'true',
        api_key: CONFIG.API_KEY,
        lang: 'sp',
        split: 'true',
        type: 'big'
    };

    var url = CONFIG.API_BASE_URL + '?' + Object.keys(params).map(function(key) {
        return key + '=' + encodeURIComponent(params[key]);
    }).join('&');

    realizarPeticionAPI(url, null, function(resultado) {
        if (resultado.exito) {
            mostrarHoroscopo(userobj, signo, fecha, resultado.datos);
        } else {
            print(userobj, 'Error al obtener el horóscopo: ' + resultado.error);
        }
    });
}

function formatDate(date) {
    var day = date.getDate();
    var month = date.getMonth() + 1;
    var year = date.getFullYear();

    day = day < 10 ? '0' + day : day;
    month = month < 10 ? '0' + month : month;

    return day + '/' + month + '/' + year;
}

function realizarPeticionAPI(url, params, callback) {
    var http = new HttpRequest();
    http.src = url;
    http.method = 'GET';

    http.oncomplete = function(exito) {
        if (exito) {
            try {
                var respuesta = JSON.parse(this.page);
                callback({ exito: true, datos: respuesta });
            } catch (error) {
                callback({ exito: false, error: 'Error al procesar la respuesta' });
            }
        } else {
            callback({ exito: false, error: 'Error en la petición HTTP' });
        }
    };

    http.download();
}

function mostrarHoroscopo(userobj, signo, fecha, datos) {
    if (datos && datos.status === 200 && datos.response) {
        var respuesta = datos.response;
        var botResponse = respuesta.bot_response;
        
        print(userobj, 'Horóscopo para ' + signo.charAt(0).toUpperCase() + signo.slice(1) + ' el ' + fecha + ':');
        print(userobj, '\u000314Color de la suerte: ' + decodeURIComponent(escape(respuesta.lucky_color)));
        print(userobj, '\u000314Número de la suerte: ' + respuesta.lucky_number.join(', '));
        
        var categorias = {
            physique: 'Físico',
            status: 'Estatus',
            finances: 'Finanzas',
            relationship: 'Relaciones',
            career: 'Carrera',
            travel: 'Viajes',
            family: 'Familia',
            friends: 'Amigos',
            health: 'Salud'
        };
        
        for (var key in categorias) {
            if (botResponse[key]) {
                var decodedResponse = decodeURIComponent(escape(botResponse[key].split_response));
                print(userobj, '\u000314' + categorias[key] + ' (' + botResponse[key].score + '/100): ' + decodedResponse);
            }
        }
        
        if (botResponse.total_score) {
            var decodedTotalScore = decodeURIComponent(escape(botResponse.total_score.split_response));
            print(userobj, '\u000314Puntuación total (' + botResponse.total_score.score + '/100): ' + decodedTotalScore);
        }
    } else {
        print(userobj, 'No se pudo obtener el horóscopo para ' + signo + ' en la fecha ' + fecha);
    }
}
