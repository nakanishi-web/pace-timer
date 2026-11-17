// DOM要素の取得
const purposeSelect = document.getElementById('purpose-select');
const targetMinutesInput = document.getElementById('target-minutes');
const timerDisplay = document.getElementById('timer-display');
const timerStatus = document.getElementById('timer-status');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const finishBtn = document.getElementById('finish-btn');
const logList = document.getElementById('log-list');
const clearAllBtn = document.getElementById('clear-all-btn'); // 🌟 追加：全削除ボタンの取得

let timerId = null;
let elapsedSeconds = 0;    // 経過秒数（0からカウントアップ）
let targetSeconds = 0;     // 目標秒数
let isRunning = false;     // 稼働中かどうか
let isPaused = false;      // 一時停止中かどうか

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

// 初期表示の設定（25分＝1500秒を目標にセット、表示は00:00:00から）
targetMinutesInput.value = 25;
targetSeconds = 25 * 60;
elapsedSeconds = 0;
updateDisplay();

// 初期状態では「終了・記録」ボタンを無効化
finishBtn.disabled = true;

// 🌟 【リロード対策】保存されていた一時停止状態があれば復元する
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
        purposeSelect.disabled = true;
        timerStatus.textContent = "一時停止中（復元）";
    }
}

// 🌟 【追加】保存されていたログを起動時に復元する
const savedLogs = localStorage.getItem('pace_timer_logs');
if (savedLogs) {
    logList.innerHTML = savedLogs;
}

// 目標時間の入力値が変わったら目標秒数を更新
targetMinutesInput.addEventListener('input', () => {
    if (!isRunning && !isPaused) {
        const mins = parseInt(targetMinutesInput.value) || 0;
        targetSeconds = mins * 60;
    }
});

// スタートボタンの処理
startBtn.addEventListener('click', () => {
    if (!isRunning) {
        // 再開でない場合は、現在の入力値を目標秒数として保持
        if (!isPaused) {
            const mins = parseInt(targetMinutesInput.value) || 25;
            targetSeconds = mins * 60;
        }

        isRunning = true;
        isPaused = false;
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        finishBtn.disabled = false;
        targetMinutesInput.disabled = true;
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

        // 🌟 【リロード対策】一時停止した瞬間の状態と秒数を保存
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
    purposeSelect.disabled = false;
    
    // 経過時間をリセット
    elapsedSeconds = 0;
    timerStatus.textContent = "待機中";
    timerStatus.classList.remove('overtime');
    updateDisplay();

    // 🌟 【リロード対策】保存データを消去
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
    purposeSelect.disabled = false;

    // タイマー初期化
    elapsedSeconds = 0;
    timerStatus.textContent = "待機中";
    timerStatus.classList.remove('overtime');
    updateDisplay();

    // 🌟 【リロード対策】保存データを消去
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

    // 🌟 【追加】現在のログ一覧をブラウザに保存する
    localStorage.setItem('pace_timer_logs', logList.innerHTML);
}

// 🌟 【追加】全削除ボタンの処理（「削除しますか？」の確認ダイアログ付き）
if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
        if (confirm('すべての作業ログを削除してもよろしいですか？')) {
            logList.innerHTML = '';
            localStorage.removeItem('pace_timer_logs');
        }
    });
}