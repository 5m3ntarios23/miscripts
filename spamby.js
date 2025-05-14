var messageHistory = {};
var spamVroom = 666;
var generalVroom = 0;
var spamThreshold = 1;
var knownSpamPhrases = {};
var spamPhraseThreshold = 1;
var userLastMessageTime = {};
var messageInterval = 200;
var userInfractions = {};
var meCommandLimit = 1;
var meCommandTimeframe = 60000;
var shortPhraseHistory = {};

function onLoad() {
    print("¡Atención! El script anti-spam ha sido cargado correctamente. make by 5m3ntarios");
    print("Los usuarios que hagan spam serán vetados inmediatamente de la sala ");
}

function onTextBefore(userobj, text) {
    if (userobj.level >= 2) {
        return text;
    }
    return processMessage(userobj, text, false);
}

function onEmoteBefore(userobj, text) {
    if (userobj.level >= 2) {
        return text;
    }
    return processMessage(userobj, text, true);
}

function eliminarCodigosColor(str) {  
    return str.replace(/\x03\d{1,2}(,\d{1,2})?|\x02|\x1F|\x0F|\x16|\x1D|\x04|\x05|\x06|\x07|\x08|\x09|\x0B|\x0C|\x0E|\x11|\x12|\x13/g, '');  
}  

function limpiarTexto(text) {
    // Elimina códigos de color y formato
    var textoLimpio = eliminarCodigosColor(text);
    
    // Elimina números al inicio
    textoLimpio = textoLimpio.replace(/^\d+/, '');
    
    // Elimina caracteres de control y espacios extras
    textoLimpio = textoLimpio
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
        
    return textoLimpio;
}

function detectInLineRepetition(text) {
    var cleanText = limpiarTexto(text);
    var words = cleanText.split(/\s+/);
    
    // Requiere al menos 10 palabras
    if (words.length < 10) return false;

    // Busca patrones de hasta la mitad del tamaño del texto
    for (var patternLength = 1; patternLength <= words.length / 2; patternLength++) {
        var pattern = words.slice(0, patternLength).join(' ');
        var count = 0;
        
        // Revisa si el patrón se repite
        for (var i = 0; i < words.length; i += patternLength) {
            var segment = words.slice(i, i + patternLength).join(' ');
            if (segment === pattern) {
                count++;
                // Cambiado de 3 a 10 repeticiones
                if (count >= 10) {
                    return true;
                }
            } else {
                break;
            }
        }
    }
    return false;
}

function detectLetterByLetterSpam(userobj, text) {
    if (!messageHistory[userobj.name]) {
        messageHistory[userobj.name] = {
            letters: [],
            timestamps: []
        };
    }

    var currentTime = Date.now();
    var cleanText = limpiarTexto(text).toLowerCase();

    while (messageHistory[userobj.name].timestamps.length > 0 &&
           currentTime - messageHistory[userobj.name].timestamps[0] > 5000) {
        messageHistory[userobj.name].letters.shift();
        messageHistory[userobj.name].timestamps.shift();
    }

    if (cleanText.length === 1 && cleanText.match(/[a-zñáéíóú]/i)) {
        messageHistory[userobj.name].letters.push(cleanText);
        messageHistory[userobj.name].timestamps.push(currentTime);

        if (messageHistory[userobj.name].letters.length >= 2) {
            return true;
        }
    }

    return false;
}

function detectWordPatternSpam(userobj, text) {
    if (!messageHistory[userobj.name]) {
        messageHistory[userobj.name] = {
            letters: [],
            timestamps: [],
            messages: []
        };
    }
    
    if (!messageHistory[userobj.name].messages) {
        messageHistory[userobj.name].messages = [];
    }

    var currentTime = Date.now();
    var cleanText = limpiarTexto(text).toLowerCase();

    var filteredMessages = [];
    for (var i = 0; i < messageHistory[userobj.name].messages.length; i++) {
        if (currentTime - messageHistory[userobj.name].messages[i].time <= 5000) {
            filteredMessages.push(messageHistory[userobj.name].messages[i]);
        }
    }
    messageHistory[userobj.name].messages = filteredMessages;

    messageHistory[userobj.name].messages.push({
        text: cleanText,
        time: currentTime
    });

    if (messageHistory[userobj.name].messages.length >= 2) {
        var messages = messageHistory[userobj.name].messages;
        var lastMsg = messages[messages.length - 1].text;
        var prevMsg = messages[messages.length - 2].text;

        if (lastMsg && prevMsg && lastMsg === prevMsg) {
            return true;
        }
    }

    return false;
}

function checkShortPhraseSpam(userobj, text, currentTime) {
    if (!shortPhraseHistory[userobj.name]) {
        shortPhraseHistory[userobj.name] = {
            phrases: [],
            times: []
        };
    }

    var history = shortPhraseHistory[userobj.name];
    
    while (history.times.length > 0 && currentTime - history.times[0] > messageInterval) {
        history.phrases.shift();
        history.times.shift();
    }

    var cleanText = limpiarTexto(text);
    history.phrases.push(cleanText.toLowerCase());
    history.times.push(currentTime);

    if (history.phrases.length >= 2) {
        var lastPhrase = history.phrases[history.phrases.length - 1];
        var count = 0;
        
        for (var i = history.phrases.length - 1; i >= 0; i--) {
            if (history.phrases[i] === lastPhrase) {
                count++;
                if (count >= 2 &&
                    (history.times[history.times.length - 1] - history.times[i]) < messageInterval) {
                    moveUserToSpamRoom(userobj);
                    print("Usuario " + userobj.name + " detectado haciendo spam con frases cortas.");
                    return true;
                }
            }
        }
    }
    return false;
}

function detectComplexPatternSpam(text) {
    // Limpia el texto de caracteres especiales
    var cleanText = limpiarTexto(text);
    
    // Normaliza el texto: quita acentos y convierte a minúsculas
    var normalizedText = cleanText
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    
    // Primero verifica si es un patrón de risa
    if (isLaughPattern(normalizedText)) {
        return checkLaughSpam(normalizedText);
    }
    
    // Si no es patrón de risa, aplica la detección normal
    var length = normalizedText.length;
    for (var i = 5; i <= length/2; i++) {
        var pattern = normalizedText.substr(0, i);
        var count = 0;
        var pos = 0;
        
        while ((pos = normalizedText.indexOf(pattern, pos)) !== -1) {
            count++;
            pos += 1;
            if (count >= 3) return true; // Mantiene el límite original de 3 para patrones normales
        }
    }
    return false;
}

// Nueva función para detectar si es un patrón de risa
function isLaughPattern(text) {
    // Detecta variaciones de "jaja", "jeje", "haha"
    return /^(ja|je|ha)+$/i.test(text);
}

// Nueva función específica para spam de risas
function checkLaughSpam(text) {
    var count = text.length / 2; // Cuenta cuántos "ja", "je" o "ha" hay
    return count > 10; // Permite hasta 10 repeticiones de "ja"
}

function processMessage(userobj, text, isEmote) {
    if (userobj.level >= 2) {
        return isEmote ? text : text;
    }

    var originalText = text;

    if (detectComplexPatternSpam(text)) {
        print("Usuario " + userobj.name + " detectado usando patrones complejos repetitivos.");
        return moveUserToSpamRoom(userobj);
    }

    if (detectLetterByLetterSpam(userobj, text)) {
        print("Usuario " + userobj.name + " detectado escribiendo letra por letra.");
        return moveUserToSpamRoom(userobj);
    }

    if (detectWordPatternSpam(userobj, text)) {
        print("Usuario " + userobj.name + " detectado usando patrones repetitivos.");
        return moveUserToSpamRoom(userobj);
    }

    if (detectInLineRepetition(text)) {
        print("Usuario " + userobj.name + " detectado usando patrones repetitivos en línea.");
        return moveUserToSpamRoom(userobj);
    }
    
    if (userobj.vroom === spamVroom) {
        return isEmote ? undefined : originalText;
    }

    var currentTime = Date.now();
    if (userLastMessageTime[userobj.name]) {
        var timeSinceLastMessage = currentTime - userLastMessageTime[userobj.name];
        if (timeSinceLastMessage < messageInterval) {
            return moveUserToSpamRoom(userobj);
        }
    }
    userLastMessageTime[userobj.name] = currentTime;

    if (isKnownSpamPhrase(text)) {
        return moveUserToSpamRoom(userobj);
    }

    if (detectSpam(userobj, text, isEmote)) {
        return undefined;
    }

    return isEmote ? text : originalText;
}

function detectSpam(userobj, text, isEmote) {
    if (!userInfractions[userobj.name]) {
        userInfractions[userobj.name] = {
            count: 0,
            lastMessages: [],
            messageTimes: [],
            lastMessageTime: 0,
            meCommands: []
        };
    }

    var currentTime = Date.now();
    var cleanText = limpiarTexto(text);
    var words = cleanText.toLowerCase().split(/\s+/);
    
    if (words.length <= 2) {
        return false;
    }

    var newMessages = [];
    var newTimes = [];
    for (var i = 0; i < userInfractions[userobj.name].lastMessages.length; i++) {
        if (currentTime - userInfractions[userobj.name].messageTimes[i] < 5000) {
            newMessages.push(userInfractions[userobj.name].lastMessages[i]);
            newTimes.push(userInfractions[userobj.name].messageTimes[i]);
        }
    }
    userInfractions[userobj.name].lastMessages = newMessages;
    userInfractions[userobj.name].messageTimes = newTimes;

    var isRepetitive = false;
    for (var i = 0; i < userInfractions[userobj.name].lastMessages.length; i++) {
        var lastMessage = userInfractions[userobj.name].lastMessages[i];
        if (lastMessage.length > 2) {
            if (containsSequence(words, lastMessage) || containsSequence(lastMessage, words)) {
                isRepetitive = true;
                break;
            }
        }
    }

    if (isRepetitive) {
        moveUserToSpamRoom(userobj);
        return true;
    }

    userInfractions[userobj.name].lastMessages.unshift(words);
    userInfractions[userobj.name].messageTimes.unshift(currentTime);
    
    if (userInfractions[userobj.name].lastMessages.length > 10) {
        userInfractions[userobj.name].lastMessages.pop();
        userInfractions[userobj.name].messageTimes.pop();
    }
    
    userInfractions[userobj.name].lastMessageTime = currentTime;

    if (isEmote) {
        userInfractions[userobj.name].meCommands.push(currentTime);
        userInfractions[userobj.name].meCommands = userInfractions[userobj.name].meCommands.filter(function(time) {
            return currentTime - time < meCommandTimeframe;
        });

        if (userInfractions[userobj.name].meCommands.length > meCommandLimit) {
            moveUserToSpamRoom(userobj);
            print("Usuario " + userobj.name + " movido de la sala por uso excesivo del comando /me.");
            return true;
        }
    }

    return false;
}

function containsSequence(arr1, arr2) {
    var str1 = arr1.join(' ');
    var str2 = arr2.join(' ');
    return str1.includes(str2) || str2.includes(str1);
}

function moveUserToSpamRoom(userobj) {
    userobj.originalVroom = userobj.vroom;
    userobj.vroom = spamVroom;
    print("AVISO: " + userobj.name + " ha sido excluído de la sala por spam.");
    return undefined;
}

function addToKnownSpamPhrases(text) {
    var cleanText = limpiarTexto(text);
    var words = cleanText.toLowerCase().split(/\s+/);
    for (var i = 0; i < words.length; i++) {
        for (var j = i; j < words.length; j++) {
            var phrase = words.slice(i, j + 1).join(' ');
            if (phrase.length > 2) {
                knownSpamPhrases[phrase] = true;
            }
        }
    }
}

function isKnownSpamPhrase(text) {
    var cleanText = limpiarTexto(text);
    var words = cleanText.toLowerCase().split(/\s+/);
    for (var i = 0; i < words.length; i++) {
        for (var j = i; j < words.length; j++) {
            var phrase = words.slice(i, j + 1).join(' ');
            if (knownSpamPhrases[phrase]) {
                return true;
            }
        }
    }
    return false;
}

function onJoin(userobj) {
    if (userobj.vroom === spamVroom) {
        userobj.vroom = userobj.originalVroom || generalVroom;
        print(userobj.name + ": Has sido movido de vuelta a la sala " + userobj.vroom + ".");
        delete userobj.originalVroom;
    }
}

function onMinute() {
    if (new Date().getMinutes() === 0) {
        messageHistory = {};
    }
}
