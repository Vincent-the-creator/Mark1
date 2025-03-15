// Konfiguration
const CONFIG = {
    SPEECH_LANG: 'de-DE',
    YT_API_KEY: 'AIzaSyCOYhQqXe6pl69Jv4yzRqtGWqT07n4Lxzo', // Hier eigenen Key eintragen
    DEFAULT_YT_VIDEO: 'dQw4w9WgXcQ'
};

// Sprachsynthese-Helper
const Speech = {
    speak(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        speechSynthesis.speak(utterance);
    },
    cancel() {
        speechSynthesis.cancel();
    }
};

// Timer-System
class TimerSystem {
    constructor() {
        this.timers = new Map();
        this.nextTimerId = 1;
    }

    setTimer(durationText) {
        const milliseconds = this.parseDuration(durationText);
        if (!milliseconds) return false;

        const timerId = this.nextTimerId++;
        const endTime = Date.now() + milliseconds;
        
        const timer = {
            id: timerId,
            endTime,
            interval: setInterval(() => this.updateTimer(timerId), 1000)
        };

        this.timers.set(timerId, timer);
        this.updateTimer(timerId);
        Speech.speak(`Timer für ${durationText} gestellt.`);
        return timerId;
    }

    parseDuration(text) {
        const timeUnits = {
            stunde: 60 * 60 * 1000,
            minute: 60 * 1000,
            sekunde: 1000
        };

        let totalMs = 0;
        const regex = /(\d+)\s*(stunden?|minuten?|sekunden?)/gi;
        let match;

        while ((match = regex.exec(text))) {
            const value = parseInt(match[1]);
            const unit = match[2].toLowerCase().replace(/n$/, '');
            totalMs += value * (timeUnits[unit] || 0);
        }

        return totalMs > 0 ? totalMs : null;
    }

    updateTimer(timerId) {
        const timer = this.timers.get(timerId);
        if (!timer) return;

        const container = document.getElementById('timers-container');
        let displayElem = document.getElementById(`timer-${timerId}`);

        if (!displayElem) {
            displayElem = document.createElement('div');
            displayElem.id = `timer-${timerId}`;
            displayElem.className = 'timer';
            container.appendChild(displayElem);
        }

        const remaining = timer.endTime - Date.now();
        if (remaining <= 0) {
            this.clearTimer(timerId);
            displayElem.textContent = "Timer abgelaufen!";
            Speech.speak("Dein Timer ist abgelaufen!");
        } else {
            const minutes = Math.floor((remaining / 1000 / 60) % 60);
            const seconds = Math.floor((remaining / 1000) % 60);
            displayElem.textContent = 
                `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    clearTimer(timerId) {
        const timer = this.timers.get(timerId);
        if (timer) {
            clearInterval(timer.interval);
            this.timers.delete(timerId);
        }
    }

    clearAllTimers() {
        this.timers.forEach(timer => clearInterval(timer.interval));
        this.timers.clear();
        document.getElementById('timers-container').innerHTML = '';
    }
}

// YouTube-Player
class YouTubePlayer {
    constructor() {
        this.player = null;
        this.ready = false;
        this.queue = [];
        this.initializePlayer();
    }

    initializePlayer() {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = () => {
            this.player = new YT.Player('player', {
                height: '360',
                width: '640',
                videoId: CONFIG.DEFAULT_YT_VIDEO,
                events: {
                    'onReady': () => this.onPlayerReady(),
                    'onStateChange': e => this.onStateChange(e)
                }
            });
        };
    }

    onPlayerReady() {
        this.ready = true;
        this.processQueue();
    }

    onStateChange(event) {
        if (event.data === YT.PlayerState.ENDED) {
            Speech.speak("Musikwiedergabe beendet");
        }
    }

    async play(songTitle) {
        try {
            const videoId = await this.searchVideo(songTitle);
            if (videoId) {
                if (this.ready) {
                    this.player.loadVideoById(videoId);
                } else {
                    this.queue.push(videoId);
                }
                Speech.speak(`Spiele ${songTitle}`);
            } else {
                Speech.speak("Konnte das Video nicht finden");
            }
        } catch (error) {
            console.error("Fehler:", error);
            Speech.speak("Fehler bei der Videowiedergabe");
        }
    }

    stop() {
        if (this.ready) {
            this.player.stopVideo();
            Speech.speak("Musik gestoppt");
        }
    }

    async searchVideo(query) {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(query)}&type=video&key=${CONFIG.YT_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        return data.items?.[0]?.id?.videoId;
    }

    processQueue() {
        if (this.queue.length > 0) {
            this.player.loadVideoById(this.queue.shift());
        }
    }
}

// Sprachsteuerung
class VoiceControl {
    constructor() {
        this.recognition = null;
        this.timerSystem = new TimerSystem();
        this.ytPlayer = new YouTubePlayer();
        this.commands = {
            'hallo': () => Speech.speak("Hallo! Wie kann ich dir helfen?"),
            'hilfe': () => this.showHelp(),
            'stopp musik': () => this.ytPlayer.stop(),
            'stopp alle timer': () => this.timerSystem.clearAllTimers(),
            'timer für (.*)': (_, duration) => this.timerSystem.setTimer(duration),
            'spiele (?:musik von )?(.*) ab': (_, song) => this.ytPlayer.play(song)
        };

        this.initializeRecognition();
        document.addEventListener('DOMContentLoaded', () => {
            Speech.speak("System bereit");
        });
    }

    showHelp() {
        const helpText = [
            "Verfügbare Befehle:",
            "'Hallo' - Begrüßung",
            "'Timer für [Zeit]' - Timer stellen (z.B. '2 Minuten 30 Sekunden')",
            "'Stopp alle Timer' - Alle Timer löschen",
            "'Spiele [Songtitel] ab' - Musik abspielen",
            "'Stopp Musik' - Musik stoppen",
            "'Hilfe' - Diese Hilfe anzeigen"
        ].join("\n");
        Speech.speak(helpText);
    }

    initializeRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.lang = CONFIG.SPEECH_LANG;
            this.recognition.onresult = e => this.processSpeech(e);
            this.recognition.start();
        } else {
            console.error("Spracherkennung nicht unterstützt!");
            Speech.speak("Ihr Browser unterstützt keine Spracherkennung");
        }
    }

    processSpeech(event) {
        const transcript = event.results[event.results.length - 1][0].transcript;
        document.getElementById("response").textContent = transcript;

        for (const [pattern, handler] of Object.entries(this.commands)) {
            const regex = new RegExp(pattern, 'i');
            const match = transcript.match(regex);
            if (match) {
                handler(...match);
                break;
            }
        }
    }
}

// Initialisierung
new VoiceControl();