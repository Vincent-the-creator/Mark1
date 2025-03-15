// Dark Mode System
const darkModeToggle = document.getElementById('dark-mode-toggle');
document.body.setAttribute('data-theme', localStorage.getItem('theme') || 'light');

darkModeToggle.addEventListener('click', () => {
    const newTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    darkModeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('theme', newTheme);
});

// YouTube Player System
class YouTubePlayer {
    constructor() {
        this.player = null;
        this.initializePlayer();
    }

    initializePlayer() {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);

        window.onYouTubeIframeAPIReady = () => {
            this.player = new YT.Player('player', {
                height: '360',
                width: '640',
                playerVars: {
                    autoplay: 1,
                    modestbranding: 1
                },
                events: {
                    'onReady': () => console.log('[Jarvis] YouTube Player bereit'),
                    'onStateChange': (e) => this.handlePlayerState(e)
                }
            });
        };
    }

    playVideo(videoId) {
        if (this.player) {
            this.player.loadVideoById(videoId);
            this.player.playVideo();
        }
    }

    handlePlayerState(event) {
        if (event.data === YT.PlayerState.ENDED) {
            document.getElementById('response').innerHTML = '🎵 Wiedergabe beendet';
        }
    }
}

// Timer System
class TimerSystem {
    constructor() {
        this.timers = new Map();
    }

    setTimer(durationText) {
        const ms = this.parseDuration(durationText);
        if (!ms) return;

        const timer = {
            id: Date.now(),
            endTime: Date.now() + ms,
            element: this.createTimerElement(durationText)
        };

        document.getElementById('timers-container').appendChild(timer.element);
        this.startCountdown(timer);
    }

    createTimerElement(durationText) {
        const element = document.createElement('div');
        element.className = 'timer';
        element.innerHTML = `
            <span>⏳ ${durationText}</span>
            <div class="time-left"></div>
        `;
        return element;
    }

    startCountdown(timer) {
        const interval = setInterval(() => {
            const remaining = timer.endTime - Date.now();
            
            if (remaining <= 0) {
                this.handleTimerEnd(timer, interval);
            } else {
                this.updateTimerDisplay(timer.element, remaining);
            }
        }, 1000);
    }

    handleTimerEnd(timer, interval) {
        clearInterval(interval);
        timer.element.innerHTML = '<span>🔔 Timer abgelaufen!</span>';
        new Audio('start-sound.mp3').play();
        setTimeout(() => timer.element.remove(), 5000);
    }

    updateTimerDisplay(element, remaining) {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        element.querySelector('.time-left').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    parseDuration(text) {
        const units = { stunde: 3600000, minute: 60000, sekunde: 1000 };
        return text.toLowerCase().split(' ')
            .reduce((total, val, index, arr) => {
                if (index % 2 === 0 && units[arr[index + 1]]) {
                    return total + (parseInt(val) * units[arr[index + 1]]);
                }
                return total;
            }, 0);
    }
}

// Sprachsteuerungssystem
class VoiceControl {
    constructor() {
        this.ytPlayer = new YouTubePlayer();
        this.timerSystem = new TimerSystem();
        this.responseBox = document.getElementById('response');
        this.voiceButton = document.getElementById('voice-button');
        this.setupRecognition();
        this.setupButton();
    }

    setupRecognition() {
        this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        this.recognition.lang = 'de-DE';
        this.recognition.continuous = true;
        this.recognition.interimResults = false;

        this.recognition.onstart = () => {
            this.responseBox.classList.add('active-listening');
            this.voiceButton.classList.add('active');
            new Audio('start-sound.mp3').play();
        };

        this.recognition.onend = () => {
            this.responseBox.classList.remove('active-listening');
            this.voiceButton.classList.remove('active');
            new Audio('end-sound.mp3').play();
        };

        this.recognition.onresult = (e) => this.handleResult(e);
        this.recognition.onerror = (e) => console.error('[Jarvis Fehler]:', e.error);
        
        this.recognition.start();
    }

    setupButton() {
        this.voiceButton.addEventListener('click', () => {
            if (this.recognition.running) {
                this.recognition.stop();
            } else {
                this.recognition.start();
            }
        });
    }

    handleResult(event) {
        const transcript = event.results[event.results.length - 1][0].transcript;
        this.responseBox.textContent = `🎤 ${transcript}`;
        
        if (transcript.toLowerCase().includes('hey jarvis')) {
            this.processCommand(transcript.toLowerCase());
        }
    }

    processCommand(command) {
        if (command.includes('spiele')) {
            const song = command.split('spiele')[1].trim();
            this.playMusic(song);
        }
        
        if (command.includes('timer für')) {
            const duration = command.split('timer für')[1].trim();
            this.timerSystem.setTimer(duration);
        }

        if (command.includes('dark mode')) {
            darkModeToggle.click();
        }
    }

    async playMusic(query) {
        try {
            const videoId = await this.searchYouTube(query);
            if (videoId) {
                this.ytPlayer.playVideo(videoId);
                this.responseBox.innerHTML = `🎵 Spiele: ${query}`;
            }
        } catch (error) {
            this.responseBox.innerHTML = '❌ Song konnte nicht gefunden werden';
        }
    }

    async searchYouTube(query) {
        const apiKey = 'DEIN_API_SCHLÜSSEL';
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();
        return data.items[0]?.id?.videoId;
    }
}

// Initialisierung
new VoiceControl();