/**
 * 邏輯回歸 (Logistic Regression) 互動教學 - JavaScript 邏輯
 * 實作二元分類演算法與視覺化
 */

// ===========================
// 全域設定與狀態
// ===========================
const CONFIG = {
    CANVAS_WIDTH: 600,
    CANVAS_HEIGHT: 500,
    POINT_RADIUS: 10,
    DEFAULT_LEARNING_RATE: 0.1,
    DEFAULT_EPOCHS: 100,
    TRAINING_POINTS_PER_CLASS: 12,
    GRID_RESOLUTION: 20, // 機率背景網格解析度
};

// 顏色配置
const COLORS = {
    classA: '#f43f5e',
    classALight: 'rgba(244, 63, 94, 0.3)',
    classB: '#06b6d4',
    classBLight: 'rgba(6, 182, 212, 0.3)',
    decisionLine: '#fbbf24',
    gridLine: 'rgba(255, 255, 255, 0.05)',
};

// 狀態管理
let state = {
    learningRate: CONFIG.DEFAULT_LEARNING_RATE,
    epochs: CONFIG.DEFAULT_EPOCHS,
    trainingData: [],
    weights: { w0: 0, w1: 0, w2: 0 }, // 偏置項 + 兩個特徵權重
    isTraining: false,
    isTrained: false,
    canvas: null,
    ctx: null,
    lossHistory: [],
};

// ===========================
// 初始化
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    initControls();
    drawSigmoidGraph();
    generateRandomData();
    render();
});

/**
 * 初始化 Canvas
 */
function initCanvas() {
    state.canvas = document.getElementById('lrCanvas');
    state.ctx = state.canvas.getContext('2d');

    // 處理高 DPI 螢幕
    const dpr = window.devicePixelRatio || 1;
    const rect = state.canvas.getBoundingClientRect();

    state.canvas.width = rect.width * dpr;
    state.canvas.height = rect.height * dpr;
    state.ctx.scale(dpr, dpr);

    state.canvas.style.width = rect.width + 'px';
    state.canvas.style.height = rect.height + 'px';

    // 儲存實際繪圖尺寸
    CONFIG.CANVAS_WIDTH = rect.width;
    CONFIG.CANVAS_HEIGHT = rect.height;

    // 點擊事件（左鍵類別 A，右鍵類別 B）
    state.canvas.addEventListener('click', handleCanvasClick);
    state.canvas.addEventListener('contextmenu', handleCanvasRightClick);
}

/**
 * 初始化控制元件
 */
function initControls() {
    const lrSlider = document.getElementById('lrSlider');
    const lrValue = document.getElementById('lrValue');
    const epochSlider = document.getElementById('epochSlider');
    const epochValue = document.getElementById('epochValue');
    const trainBtn = document.getElementById('trainBtn');
    const resetBtn = document.getElementById('resetBtn');
    const randomBtn = document.getElementById('randomBtn');

    // 學習率滑桿
    lrSlider.addEventListener('input', (e) => {
        state.learningRate = parseFloat(e.target.value);
        lrValue.textContent = state.learningRate.toFixed(3);
    });

    // 訓練週期滑桿
    epochSlider.addEventListener('input', (e) => {
        state.epochs = parseInt(e.target.value);
        epochValue.textContent = state.epochs;
    });

    // 訓練按鈕
    trainBtn.addEventListener('click', () => {
        if (!state.isTraining && state.trainingData.length >= 2) {
            trainModel();
        }
    });

    // 重置按鈕
    resetBtn.addEventListener('click', () => {
        resetAll();
    });

    // 隨機資料按鈕
    randomBtn.addEventListener('click', () => {
        generateRandomData();
        state.isTrained = false;
        state.weights = { w0: 0, w1: 0, w2: 0 };
        state.lossHistory = [];
        render();
        resetResultPanel();
    });
}

// ===========================
// 資料生成
// ===========================

/**
 * 生成隨機訓練資料（兩個類別的群集）
 */
function generateRandomData() {
    state.trainingData = [];

    // 類別 A（標籤 0）：左上區域
    const centerA = { x: CONFIG.CANVAS_WIDTH * 0.3, y: CONFIG.CANVAS_HEIGHT * 0.35 };
    for (let i = 0; i < CONFIG.TRAINING_POINTS_PER_CLASS; i++) {
        state.trainingData.push({
            x: centerA.x + gaussianRandom() * 70,
            y: centerA.y + gaussianRandom() * 70,
            label: 0, // 類別 A
        });
    }

    // 類別 B（標籤 1）：右下區域
    const centerB = { x: CONFIG.CANVAS_WIDTH * 0.7, y: CONFIG.CANVAS_HEIGHT * 0.65 };
    for (let i = 0; i < CONFIG.TRAINING_POINTS_PER_CLASS; i++) {
        state.trainingData.push({
            x: centerB.x + gaussianRandom() * 70,
            y: centerB.y + gaussianRandom() * 70,
            label: 1, // 類別 B
        });
    }
}

/**
 * 高斯（常態）分佈隨機數生成器
 * 使用 Box-Muller 轉換
 */
function gaussianRandom() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// ===========================
// 邏輯回歸核心演算法
// ===========================

/**
 * Sigmoid 函數
 */
function sigmoid(z) {
    // 防止數值溢位
    if (z > 500) return 1;
    if (z < -500) return 0;
    return 1 / (1 + Math.exp(-z));
}

/**
 * 預測機率
 */
function predict(x, y) {
    // 正規化座標到 [0, 1]
    const normX = x / CONFIG.CANVAS_WIDTH;
    const normY = y / CONFIG.CANVAS_HEIGHT;
    const z = state.weights.w0 + state.weights.w1 * normX + state.weights.w2 * normY;
    return sigmoid(z);
}

/**
 * 計算損失函數（Binary Cross-Entropy）
 */
function calculateLoss() {
    let loss = 0;
    const n = state.trainingData.length;

    for (const point of state.trainingData) {
        const p = predict(point.x, point.y);
        // 防止 log(0)
        const pClipped = Math.max(Math.min(p, 0.9999), 0.0001);
        loss += -point.label * Math.log(pClipped) - (1 - point.label) * Math.log(1 - pClipped);
    }

    return loss / n;
}

/**
 * 梯度下降訓練
 */
async function trainModel() {
    state.isTraining = true;
    state.isTrained = false;
    state.lossHistory = [];

    const trainBtn = document.getElementById('trainBtn');
    trainBtn.disabled = true;
    trainBtn.textContent = '⏳ 訓練中...';

    // 初始化權重
    state.weights = { w0: 0, w1: 0, w2: 0 };

    const n = state.trainingData.length;

    for (let epoch = 0; epoch < state.epochs; epoch++) {
        let gradW0 = 0, gradW1 = 0, gradW2 = 0;

        // 計算梯度
        for (const point of state.trainingData) {
            const normX = point.x / CONFIG.CANVAS_WIDTH;
            const normY = point.y / CONFIG.CANVAS_HEIGHT;
            const p = predict(point.x, point.y);
            const error = p - point.label;

            gradW0 += error;
            gradW1 += error * normX;
            gradW2 += error * normY;
        }

        // 更新權重
        state.weights.w0 -= state.learningRate * (gradW0 / n);
        state.weights.w1 -= state.learningRate * (gradW1 / n);
        state.weights.w2 -= state.learningRate * (gradW2 / n);

        // 記錄損失
        const loss = calculateLoss();
        state.lossHistory.push(loss);

        // 每 10 個 epoch 更新視覺化
        if (epoch % 10 === 0 || epoch === state.epochs - 1) {
            render();
            updateResultPanel();
            // 給瀏覽器渲染時間
            await new Promise(resolve => setTimeout(resolve, 20));
        }
    }

    state.isTraining = false;
    state.isTrained = true;
    trainBtn.disabled = false;
    trainBtn.textContent = '🚀 開始訓練';

    render();
    updateResultPanel();
}

/**
 * 計算準確率
 */
function calculateAccuracy() {
    let correct = 0;
    for (const point of state.trainingData) {
        const p = predict(point.x, point.y);
        const predicted = p >= 0.5 ? 1 : 0;
        if (predicted === point.label) correct++;
    }
    return (correct / state.trainingData.length) * 100;
}

// ===========================
// 事件處理
// ===========================

/**
 * 處理畫布左鍵點擊（新增類別 A）
 */
function handleCanvasClick(event) {
    if (state.isTraining) return;

    const rect = state.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (x < 0 || x > CONFIG.CANVAS_WIDTH || y < 0 || y > CONFIG.CANVAS_HEIGHT) return;

    state.trainingData.push({ x, y, label: 0 });
    state.isTrained = false;
    render();
}

/**
 * 處理畫布右鍵點擊（新增類別 B）
 */
function handleCanvasRightClick(event) {
    event.preventDefault();
    if (state.isTraining) return;

    const rect = state.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (x < 0 || x > CONFIG.CANVAS_WIDTH || y < 0 || y > CONFIG.CANVAS_HEIGHT) return;

    state.trainingData.push({ x, y, label: 1 });
    state.isTrained = false;
    render();
}

/**
 * 重置所有狀態
 */
function resetAll() {
    state.trainingData = [];
    state.weights = { w0: 0, w1: 0, w2: 0 };
    state.isTrained = false;
    state.lossHistory = [];
    render();
    resetResultPanel();
}

// ===========================
// 渲染
// ===========================

/**
 * 主渲染函數
 */
function render() {
    clearCanvas();
    drawGrid();

    if (state.isTrained || state.isTraining) {
        drawProbabilityBackground();
        drawDecisionBoundary();
    }

    drawTrainingData();
}

/**
 * 清除畫布
 */
function clearCanvas() {
    const gradient = state.ctx.createLinearGradient(0, 0, 0, CONFIG.CANVAS_HEIGHT);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');

    state.ctx.fillStyle = gradient;
    state.ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
}

/**
 * 繪製網格背景
 */
function drawGrid() {
    const gridSize = 50;
    state.ctx.strokeStyle = COLORS.gridLine;
    state.ctx.lineWidth = 1;

    for (let x = 0; x <= CONFIG.CANVAS_WIDTH; x += gridSize) {
        state.ctx.beginPath();
        state.ctx.moveTo(x, 0);
        state.ctx.lineTo(x, CONFIG.CANVAS_HEIGHT);
        state.ctx.stroke();
    }

    for (let y = 0; y <= CONFIG.CANVAS_HEIGHT; y += gridSize) {
        state.ctx.beginPath();
        state.ctx.moveTo(0, y);
        state.ctx.lineTo(CONFIG.CANVAS_WIDTH, y);
        state.ctx.stroke();
    }
}

/**
 * 繪製機率背景（熱力圖）
 */
function drawProbabilityBackground() {
    const cellWidth = CONFIG.CANVAS_WIDTH / CONFIG.GRID_RESOLUTION;
    const cellHeight = CONFIG.CANVAS_HEIGHT / CONFIG.GRID_RESOLUTION;

    for (let i = 0; i < CONFIG.GRID_RESOLUTION; i++) {
        for (let j = 0; j < CONFIG.GRID_RESOLUTION; j++) {
            const x = i * cellWidth + cellWidth / 2;
            const y = j * cellHeight + cellHeight / 2;
            const prob = predict(x, y);

            // 根據機率混合顏色
            const r = Math.round(244 * (1 - prob) + 6 * prob);
            const g = Math.round(63 * (1 - prob) + 182 * prob);
            const b = Math.round(94 * (1 - prob) + 212 * prob);

            state.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.3)`;
            state.ctx.fillRect(i * cellWidth, j * cellHeight, cellWidth, cellHeight);
        }
    }
}

/**
 * 繪製決策邊界
 */
function drawDecisionBoundary() {
    // 決策邊界：w0 + w1*x + w2*y = 0（機率 = 0.5 的位置）
    // 求解 y = -(w0 + w1*x) / w2

    if (Math.abs(state.weights.w2) < 0.001) {
        // w2 接近 0，垂直線
        if (Math.abs(state.weights.w1) > 0.001) {
            const xBoundary = (-state.weights.w0 / state.weights.w1) * CONFIG.CANVAS_WIDTH;
            state.ctx.beginPath();
            state.ctx.moveTo(xBoundary, 0);
            state.ctx.lineTo(xBoundary, CONFIG.CANVAS_HEIGHT);
            state.ctx.strokeStyle = COLORS.decisionLine;
            state.ctx.lineWidth = 3;
            state.ctx.stroke();
        }
        return;
    }

    const points = [];
    for (let px = 0; px <= CONFIG.CANVAS_WIDTH; px += 5) {
        const normX = px / CONFIG.CANVAS_WIDTH;
        const normY = -(state.weights.w0 + state.weights.w1 * normX) / state.weights.w2;
        const y = normY * CONFIG.CANVAS_HEIGHT;

        if (y >= 0 && y <= CONFIG.CANVAS_HEIGHT) {
            points.push({ x: px, y });
        }
    }

    if (points.length >= 2) {
        state.ctx.beginPath();
        state.ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
            state.ctx.lineTo(points[i].x, points[i].y);
        }

        state.ctx.strokeStyle = COLORS.decisionLine;
        state.ctx.lineWidth = 3;
        state.ctx.shadowColor = COLORS.decisionLine;
        state.ctx.shadowBlur = 10;
        state.ctx.stroke();
        state.ctx.shadowBlur = 0;
    }
}

/**
 * 繪製訓練資料點
 */
function drawTrainingData() {
    state.trainingData.forEach(point => {
        const isClassA = point.label === 0;
        const color = isClassA ? COLORS.classA : COLORS.classB;
        const glowColor = isClassA ? COLORS.classALight : COLORS.classBLight;

        // 發光效果
        state.ctx.beginPath();
        state.ctx.arc(point.x, point.y, CONFIG.POINT_RADIUS + 5, 0, Math.PI * 2);
        state.ctx.fillStyle = glowColor;
        state.ctx.fill();

        // 主要圓點
        state.ctx.beginPath();
        state.ctx.arc(point.x, point.y, CONFIG.POINT_RADIUS, 0, Math.PI * 2);
        state.ctx.fillStyle = color;
        state.ctx.fill();

        // 高光效果
        state.ctx.beginPath();
        state.ctx.arc(point.x - 3, point.y - 3, CONFIG.POINT_RADIUS * 0.3, 0, Math.PI * 2);
        state.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        state.ctx.fill();

        // 標籤文字
        state.ctx.font = 'bold 10px Noto Sans TC';
        state.ctx.fillStyle = 'white';
        state.ctx.textAlign = 'center';
        state.ctx.textBaseline = 'middle';
        state.ctx.fillText(isClassA ? 'A' : 'B', point.x, point.y);
    });
}

/**
 * 繪製 Sigmoid 函數圖表
 */
function drawSigmoidGraph() {
    const container = document.getElementById('sigmoidGraph');
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.width = container.offsetWidth * 2;
    canvas.height = 80 * 2;
    canvas.style.width = '100%';
    canvas.style.height = '80px';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    const w = container.offsetWidth;
    const h = 80;

    // 背景格線
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    // 水平中線（y=0.5）
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // 垂直中線（x=0）
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();

    // 繪製 Sigmoid 曲線
    ctx.beginPath();
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2;

    for (let px = 0; px <= w; px++) {
        const z = (px - w / 2) / (w / 10); // 將 x 座標映射到 [-5, 5]
        const sigVal = sigmoid(z);
        const py = h - sigVal * h; // 翻轉 y 軸

        if (px === 0) {
            ctx.moveTo(px, py);
        } else {
            ctx.lineTo(px, py);
        }
    }
    ctx.stroke();

    // 標記
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Noto Sans TC';
    ctx.textAlign = 'left';
    ctx.fillText('1', 5, 12);
    ctx.fillText('0', 5, h - 5);
    ctx.textAlign = 'center';
    ctx.fillText('0', w / 2, h - 5);
}

// ===========================
// UI 更新
// ===========================

/**
 * 更新結果面板
 */
function updateResultPanel() {
    const resultPanel = document.getElementById('resultPanel');

    if (!state.isTrained && !state.isTraining) {
        resetResultPanel();
        return;
    }

    const accuracy = calculateAccuracy();
    const lastLoss = state.lossHistory.length > 0
        ? state.lossHistory[state.lossHistory.length - 1]
        : 0;

    const countA = state.trainingData.filter(p => p.label === 0).length;
    const countB = state.trainingData.filter(p => p.label === 1).length;

    resultPanel.innerHTML = `
        <h3>📋 訓練結果</h3>
        <div class="result-content">
            <div class="result-header">
                <span class="result-label">準確率：</span>
                <span class="result-accuracy">${accuracy.toFixed(1)}%</span>
            </div>
            <div class="result-details">
                <div class="detail-item">
                    <div class="detail-label">類別 A 數量</div>
                    <div class="detail-value class-a">${countA}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">類別 B 數量</div>
                    <div class="detail-value class-b">${countB}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">最終損失</div>
                    <div class="detail-value">${lastLoss.toFixed(4)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">訓練週期</div>
                    <div class="detail-value">${state.lossHistory.length}</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * 重置結果面板
 */
function resetResultPanel() {
    const resultPanel = document.getElementById('resultPanel');
    resultPanel.innerHTML = `
        <h3>📋 訓練結果</h3>
        <div class="result-placeholder">
            <span class="icon">🎯</span>
            <p>點擊「開始訓練」查看分類結果</p>
        </div>
    `;
}

// ===========================
// 視窗大小調整
// ===========================
window.addEventListener('resize', () => {
    clearTimeout(window.resizeTimeout);
    window.resizeTimeout = setTimeout(() => {
        initCanvas();
        render();
    }, 250);
});
