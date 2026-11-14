// DOM要素の取得
const purposeSelect = document.getElementById('purpose-select');
const targetMinutesInput = document.getElementById('target-minutes');
const timerDisplay = document.getElementById('timer-display');
const timerStatus = document.getElementById('timer-status');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const logList = document.getElementById('log-list');

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

// 目標時間の入力値が変わったら目標秒数を更新
targetMinutesInput.addEventListener('input', () => {
    if (!isRunning && !isPaused) {
        const mins = parseInt(targetMinutesInput.value) || 0;
        targetSeconds = mins * 60;
    }
});

// ========================================
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
        targetMinutesInput.disabled = true;
        purposeSelect.disabled = true;
        timerStatus.textContent = "計測中...";
        timerStatus.classList.remove('overtime');

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
        timerStatus.textContent = "一時停止中";
    }
});

// リセット（終了・記録）ボタンの処理
resetBtn.addEventListener('click', () => {
    // 💡 稼働中または一時停止中で、かつ「30秒以上」計測していた場合のみログに残す
    if ((isRunning || isPaused) && elapsedSeconds >= 30) {
        addLog();
    }

    clearInterval(timerId);
    isRunning = false;
    isPaused = false;
    startBtn.disabled = false;
    startBtn.textContent = "スタート";
    pauseBtn.disabled = true;
    targetMinutesInput.disabled = false;
    purposeSelect.disabled = false;
    
    // 経過時間をリセット
    elapsedSeconds = 0;
    timerStatus.textContent = "待機中";
    timerStatus.classList.remove('overtime');
    updateDisplay();
});

// ログ追加関数
function addLog() {
    const purposeText = purposeSelect.options[purposeSelect.selectedIndex].text;
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const liItem = document.createElement('li');
    
    // 💡 記録完了の横にスタイリッシュな「×」削除ボタンを配置
    liItem.innerHTML = `
        <span>[${timeString}] ${purposeText} (計 ${formatTime(elapsedSeconds)})</span>
        <div class="log-right" style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 0.85rem; opacity: 0.8;">記録完了</span>
            <button class="delete-btn" style="background: none; border: none; color: #aaa; cursor: pointer; font-size: 1.1rem; padding: 2px 6px; transition: color 0.2s;">×</button>
        </div>
    `;
    
    // ホバー時の色変化（お好みでJSやCSSで調整可能）
    const deleteBtn = liItem.querySelector('.delete-btn');
    deleteBtn.addEventListener('mouseenter', () => { deleteBtn.style.color = '#ff5555'; });
    deleteBtn.addEventListener('mouseleave', () => { deleteBtn.style.color = '#aaa'; });
    
    // 削除ボタンがクリックされたときの処理
    deleteBtn.addEventListener('click', () => {
        logList.removeChild(liItem);
    });
    
    logList.prepend(liItem);
}