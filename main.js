// DOM要素の取得
const purposeSelect = document.getElementById('purpose-select');
const targetMinutesInput = document.getElementById('target-minutes');
const presetRadios = document.querySelectorAll('input[name="target-preset"]');
const customMinutesWrapper = document.getElementById('custom-minutes-wrapper');
const timerDisplay = document.getElementById('timer-display');
const timerStatus = document.getElementById('timer-status');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const finishBtn = document.getElementById('finish-btn');
const logList = document.getElementById('log-list');
const clearAllBtn = document.getElementById('clear-all-btn');

const STORAGE_PRESET_KEY = 'pace_timer_target_preset';
const STORAGE_CUSTOM_MINUTES_KEY = 'pace_timer_custom_minutes';

let timerId = null;
let elapsedSeconds = 0;    // 経過秒数（0からカウントアップ）
let targetSeconds = 0;     // 目標秒数
let isRunning = false;     // 稼働中かどうか
let isPaused = false;      // 一時停止中かどうか
let audioCtx = null;       // Web Audio API 用コンテキスト

// Web Audio API の AudioContext を取得・再開する関数
function getAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!audioCtx) {
        audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
    return audioCtx;
}

// 1回分の3連チャイム（C5 -> E5 -> G5）を再生するヘルパー関数
function playSingleChime(ctx, baseTime) {
    const notes = [
        { freq: 523.25, offset: 0,    duration: 0.28 }, // C5
        { freq: 659.25, offset: 0.20, duration: 0.28 }, // E5
        { freq: 783.99, offset: 0.40, duration: 0.42 }  // G5
    ];

    notes.forEach(({ freq, offset, duration }) => {
        const startTime = baseTime + offset;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, startTime);

        gainNode.gain.setValueAtTime(0.0001, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.13, startTime + 0.025);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration + 0.02);
    });
}

// 目標到達時の通知音（3連チャイムを2回リピート・自動停止）を再生する関数
function playNotificationSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const repeatGap = 1.5; // 1回目と2回目の間隔（秒）

        playSingleChime(ctx, now);
        playSingleChime(ctx, now + repeatGap);
    } catch (e) {
        // 音声再生に失敗してもタイマー処理は継続する
    }
}

// 秒数を "HH:MM:SS" 形式にフォーマットする関数
function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const h = String(hrs).padStart(2, '0');
    const m = String(mins).padStart(2, '0');
    const s = String(secs).padStart(2, '0');

    return `${h}:${m}:${s}`;
}

// 画面のタイマー表示を更新する関数
function updateDisplay() {
    timerDisplay.textContent = formatTime(elapsedSeconds);
}

// ラジオボタンの有効/無効を切り替える関数
function setPresetDisabled(disabled) {
    presetRadios.forEach((radio) => {
        radio.disabled = disabled;
    });
}

// 現在の目標時間設定を localStorage に保存する関数
function saveTargetSetting() {
    const selectedRadio = document.querySelector('input[name="target-preset"]:checked');
    if (selectedRadio) {
        localStorage.setItem(STORAGE_PRESET_KEY, selectedRadio.value);
    }

    const customMins = parseInt(targetMinutesInput.value, 10);
    if (!Number.isNaN(customMins) && customMins > 0) {
        localStorage.setItem(STORAGE_CUSTOM_MINUTES_KEY, String(customMins));
    }
}

// 保存された目標時間設定を復元する関数
function restoreTargetSetting() {
    const savedPreset = localStorage.getItem(STORAGE_PRESET_KEY);
    const savedCustomMinutes = parseInt(localStorage.getItem(STORAGE_CUSTOM_MINUTES_KEY), 10);

    let initialMinutes = 30;

    if (savedPreset === 'custom') {
        const customRadio = document.querySelector('input[name="target-preset"][value="custom"]');
        if (customRadio) {
            customRadio.checked = true;
        }
        customMinutesWrapper.hidden = false;

        initialMinutes = (!Number.isNaN(savedCustomMinutes) && savedCustomMinutes > 0)
            ? savedCustomMinutes
            : 30;
        targetMinutesInput.value = initialMinutes;
    } else if (['15', '30', '45', '60'].includes(savedPreset)) {
        const presetRadio = document.querySelector(`input[name="target-preset"][value="${savedPreset}"]`);
        if (presetRadio) {
            presetRadio.checked = true;
        }
        customMinutesWrapper.hidden = true;
        initialMinutes = parseInt(savedPreset, 10);
        targetMinutesInput.value = initialMinutes;
    } else {
        const defaultRadio = document.querySelector('input[name="target-preset"][value="30"]');
        if (defaultRadio) {
            defaultRadio.checked = true;
        }
        customMinutesWrapper.hidden = true;
        targetMinutesInput.value = initialMinutes;
    }

    targetSeconds = initialMinutes * 60;
}

// プリセット選択状態を反映する関数
function handlePresetChange() {
    const selectedRadio = document.querySelector('input[name="target-preset"]:checked');
    if (!selectedRadio) return;

    if (selectedRadio.value === 'custom') {
        customMinutesWrapper.hidden = false;
        const savedCustomMinutes = parseInt(localStorage.getItem(STORAGE_CUSTOM_MINUTES_KEY), 10);
        if (!Number.isNaN(savedCustomMinutes) && savedCustomMinutes > 0) {
            targetMinutesInput.value = savedCustomMinutes;
            if (!isRunning && !isPaused) {
                targetSeconds = savedCustomMinutes * 60;
            }
        }
        targetMinutesInput.focus();
    } else {
        customMinutesWrapper.hidden = true;
        const mins = parseInt(selectedRadio.value, 10) || 30;
        targetMinutesInput.value = mins;
        if (!isRunning && !isPaused) {
            targetSeconds = mins * 60;
        }
    }

    saveTargetSetting();
}

presetRadios.forEach((radio) => {
    radio.addEventListener('change', handlePresetChange);
});

// 初期表示の設定（保存された設定があれば復元、表示は00:00:00から）
restoreTargetSetting();
elapsedSeconds = 0;
updateDisplay();

// 初期状態では「終了・記録」ボタンを無効化
finishBtn.disabled = true;

// 保存されていた一時停止状態があれば復元する
const savedState = localStorage.getItem('pace_timer_state');
if (savedState === 'paused') {
    const savedSeconds = parseInt(localStorage.getItem('pace_timer_paused_seconds')) || 0;
    if (savedSeconds > 0) {
        elapsedSeconds = savedSeconds;
        updateDisplay();

        isPaused = true;
        startBtn.textContent = "再開";
        pauseBtn.disabled = true;
        finishBtn.disabled = false;
        targetMinutesInput.disabled = true;
        setPresetDisabled(true);
        purposeSelect.disabled = true;
        timerStatus.textContent = "一時停止中（復元）";
    }
}

// 保存されていたログを起動時に復元する
const savedLogs = localStorage.getItem('pace_timer_logs');
if (savedLogs) {
    logList.innerHTML = savedLogs;
}

// 目標時間の入力値が変わったら目標秒数を更新し、設定を保存
targetMinutesInput.addEventListener('input', () => {
    if (!isRunning && !isPaused) {
        const mins = parseInt(targetMinutesInput.value) || 0;
        targetSeconds = mins * 60;
    }
    saveTargetSetting();
});

// スタートボタンの処理
startBtn.addEventListener('click', () => {
    if (!isRunning) {
        // ユーザー操作のタイミングで AudioContext を有効化
        getAudioContext();

        // 再開でない場合は、現在の入力値を目標秒数として保持
        if (!isPaused) {
            const mins = parseInt(targetMinutesInput.value) || 30;
            targetSeconds = mins * 60;
        }

        isRunning = true;
        isPaused = false;
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        finishBtn.disabled = false;
        targetMinutesInput.disabled = true;
        setPresetDisabled(true);
        purposeSelect.disabled = true;
        timerStatus.textContent = "計測中...";
        timerStatus.classList.remove('overtime');

        // スタートしたら一時停止の保存データはクリア
        localStorage.removeItem('pace_timer_state');
        localStorage.removeItem('pace_timer_paused_seconds');

        // 1秒ごとのカウントアップ処理
        timerId = setInterval(() => {
            elapsedSeconds++;

            // 目標時間に達しているか、超えているかの判定
            if (elapsedSeconds === targetSeconds) {
                timerStatus.textContent = "目標時間到達！マイペース継続中...";
                timerStatus.classList.add('overtime');
                playNotificationSound();
            } else if (elapsedSeconds > targetSeconds) {
                const overSec = elapsedSeconds - targetSeconds;
                timerStatus.textContent = `超過タイム (+${formatTime(overSec)})`;
                timerStatus.classList.add('overtime');
            }

            updateDisplay();
        }, 1000);
    }
});

// 一時停止ボタンの処理
pauseBtn.addEventListener('click', () => {
    if (isRunning) {
        clearInterval(timerId);
        isRunning = false;
        isPaused = true;
        startBtn.disabled = false;
        startBtn.textContent = "再開";
        pauseBtn.disabled = true;
        finishBtn.disabled = false;
        timerStatus.textContent = "一時停止中";

        //【リロード対策】一時停止した瞬間の状態と秒数を保存
        localStorage.setItem('pace_timer_state', 'paused');
        localStorage.setItem('pace_timer_paused_seconds', elapsedSeconds);
    }
});

// リセット（純粋なやり直し）ボタンの処理
resetBtn.addEventListener('click', () => {
    clearInterval(timerId);
    isRunning = false;
    isPaused = false;
    startBtn.disabled = false;
    startBtn.textContent = "スタート";
    pauseBtn.disabled = true;
    finishBtn.disabled = true;
    targetMinutesInput.disabled = false;
    setPresetDisabled(false);
    purposeSelect.disabled = false;

    // 経過時間をリセット
    elapsedSeconds = 0;
    timerStatus.textContent = "待機中";
    timerStatus.classList.remove('overtime');
    updateDisplay();

    // 保存データを消去
    localStorage.removeItem('pace_timer_state');
    localStorage.removeItem('pace_timer_paused_seconds');
});

// 終了・記録ボタンの処理
finishBtn.addEventListener('click', () => {
    if (elapsedSeconds >= 30) {
        addLog();
    }

    clearInterval(timerId);
    isRunning = false;
    isPaused = false;
    startBtn.disabled = false;
    startBtn.textContent = "スタート";
    pauseBtn.disabled = true;
    finishBtn.disabled = true;
    targetMinutesInput.disabled = false;
    setPresetDisabled(false);
    purposeSelect.disabled = false;

    // タイマー初期化
    elapsedSeconds = 0;
    timerStatus.textContent = "待機中";
    timerStatus.classList.remove('overtime');
    updateDisplay();

    //【リロード対策】保存データを消去
    localStorage.removeItem('pace_timer_state');
    localStorage.removeItem('pace_timer_paused_seconds');
});

// ログ追加関数
function addLog() {
    const purposeText = purposeSelect.options[purposeSelect.selectedIndex].text;
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const liItem = document.createElement('li');
    liItem.innerHTML = `<span>[${timeString}] ${purposeText} (計 ${formatTime(elapsedSeconds)})</span><span>記録完了</span>`;
    logList.prepend(liItem);

    // 現在のログ一覧をブラウザに保存する
    localStorage.setItem('pace_timer_logs', logList.innerHTML);
}

// 全削除ボタンの処理（「削除しますか？」の確認ダイアログ付き）
if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
        if (confirm('すべての作業ログを削除してもよろしいですか？')) {
            logList.innerHTML = '';
            localStorage.removeItem('pace_timer_logs');
        }
    });
}