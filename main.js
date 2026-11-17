// ========================================
// DOM要素の取得
// ========================================
const purposeSelect = document.getElementById('purpose-select');
const targetMinutesInput = document.getElementById('target-minutes');
const timerDisplay = document.getElementById('timer-display');
const timerStatus = document.getElementById('timer-status');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const logList = document.getElementById('log-list');
const clearAllBtn = document.getElementById('clear-all-btn'); // 💡 追加：全削除ボタン

// ========================================
// 状態管理用変数
// ========================================
let timerId = null;
let isRunning = false;
let isPaused = false;

let targetSeconds = 25 * 60; // 目標時間（秒）
let elapsedSeconds = 0;     // 経過時間（秒）

// ========================================
// ローカルストレージ関連の処理
// ========================================
const STORAGE_KEY = 'pace_timer_logs';

// ローカルストレージにログ配列を保存する
function saveLogsToStorage(logsArray) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logsArray));
}

// ローカルストレージからログを読み込んで復元する
function loadLogs() {
    const savedLogs = localStorage.getItem(STORAGE_KEY);
    if (!savedLogs) return;

    try {
        const logsArray = JSON.parse(savedLogs);
        // 保存されている配列を元に画面へ復元（保存時は新しいものが上なのでそのまま描画）
        logsArray.forEach(log => {
            renderLogItem(log.timeString, log.purposeText, log.elapsedText, false);
        });
    } catch (e) {
        console.error('ログの読み込みに失敗しました:', e);
    }
}

// 現在の画面上のリストから全ログのデータを集めてストレージを更新する
function updateStorageFromDOM() {
    const logsArray = [];
    const items = logList.querySelectorAll('li');
    
    items.forEach(item => {
        const timeString = item.dataset.time;
        const purposeText = item.dataset.purpose;
        const elapsedText = item.dataset.elapsed;
        logsArray.push({ timeString, purposeText, elapsedText });
    });
    
    saveLogsToStorage(logsArray);
}

// ========================================
// ユーティリティ関数
// ========================================
function formatTime(totalSeconds) {
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(Math.floor(totalSeconds % 60)).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

function updateDisplay() {
    timerDisplay.textContent = formatTime(elapsedSeconds);
}

// ========================================
// ログ描画・追加・削除の処理
// ========================================
function renderLogItem(timeString, purposeText, elapsedText, shouldSave = true) {
    const liItem = document.createElement('li');
    
    // 後からデータを再取得しやすいようにカスタムデータ属性として保持させておく
    liItem.dataset.time = timeString;
    liItem.dataset.purpose = purposeText;
    liItem.dataset.elapsed = elapsedText;
    
    liItem.innerHTML = `
        <span class="log-text">[${timeString}] ${purposeText} (計 ${elapsedText})</span>
        <div class="log-right" style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 0.85rem; opacity: 0.8;">記録完了</span>
            <button class="delete-btn" style="background: none; border: none; color: #aaa; cursor: pointer; font-size: 1.1rem; padding: 2px 6px; transition: color 0.2s;">×</button>
        </div>
    `;
    
    const deleteBtn = liItem.querySelector('.delete-btn');
    deleteBtn.addEventListener('mouseenter', () => { deleteBtn.style.color = '#ff5555'; });
    deleteBtn.addEventListener('mouseleave', () => { deleteBtn.style.color = '#aaa'; });
    
    // 個別削除
    deleteBtn.addEventListener('click', () => {
        logList.removeChild(liItem);
        updateStorageFromDOM(); // 削除後にストレージを更新
    });
    
    logList.prepend(liItem);

    // 新規追加時のみストレージを更新
    if (shouldSave) {
        updateStorageFromDOM();
    }
}

function addLog() {
    const purposeText = purposeSelect.options[purposeSelect.selectedIndex].text;
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const elapsedText = formatTime(elapsedSeconds);
    
    renderLogItem(timeString, purposeText, elapsedText, true);
}

// ========================================
// タイマー制御のイベントリスナー
// ========================================

targetMinutesInput.addEventListener('change', () => {
    let val = parseInt(targetMinutesInput.value, 10);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 180) val = 180;
    targetMinutesInput.value = val;

    targetSeconds = val * 60;
});

startBtn.addEventListener('click', () => {
    if (isRunning) return;

    isRunning = true;
    isPaused = false;
    startBtn.disabled = true;
    startBtn.textContent = "実行中";
    pauseBtn.disabled = false;
    targetMinutesInput.disabled = true;
    purposeSelect.disabled = true;
    timerStatus.textContent = "計測中...";

    timerId = setInterval(() => {
        elapsedSeconds++;
        updateDisplay();
    }, 1000);
});

pauseBtn.addEventListener('click', () => {
    if (!isRunning) return;

    clearInterval(timerId);
    isRunning = false;
    isPaused = true;
    startBtn.disabled = false;
    startBtn.textContent = "再開";
    pauseBtn.disabled = true;
    timerStatus.textContent = "一時停止中";
});

resetBtn.addEventListener('click', () => {
    // 30秒以上計測していた場合のみログに残す
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
    
    elapsedSeconds = 0;
    timerStatus.textContent = "待機中";
    timerStatus.classList.remove('overtime');
    updateDisplay();
});

// 💡 追加：全削除ボタンのクリックイベント
if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
        const items = logList.querySelectorAll('li');
        if (items.length === 0) return;

        if (window.confirm('すべての作業ログを削除してもよろしいですか？')) {
            logList.innerHTML = ''; // 画面上のリストを空にする
            saveLogsToStorage([]);  // ローカルストレージ側も空の配列で上書き
        }
    });
}

// ========================================
// アプリ起動時の初期化処理
// ========================================
targetMinutesInput.value = 25;
targetSeconds = 25 * 60;
elapsedSeconds = 0;
updateDisplay();

loadLogs();