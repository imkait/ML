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
    degree: 1, // New: Polynomial Degree
    dispersion: 70, // New: Data Dispersion
    trainingData: [],
    weights: [], // New: Array of weights, size depends on degree
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

    // Degree Slider
    const degreeSlider = document.getElementById('degreeSlider');
    const degreeValue = document.getElementById('degreeValue');
    degreeSlider.addEventListener('input', (e) => {
        state.degree = parseInt(e.target.value);
        degreeValue.textContent = state.degree;
        // Reset model when degree changes
        state.isTrained = false;
        state.weights = [];
        state.lossHistory = [];
        render();
        resetResultPanel();
    });

    // Dispersion Slider
    const dispersionSlider = document.getElementById('dispersionSlider');
    const dispersionValue = document.getElementById('dispersionValue');
    dispersionSlider.addEventListener('input', (e) => {
        state.dispersion = parseInt(e.target.value);
        dispersionValue.textContent = state.dispersion;
        generateRandomData();
        state.isTrained = false;
        state.weights = [];
        state.lossHistory = [];
        render();
        resetResultPanel();
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
        state.weights = [];
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
            x: centerA.x + gaussianRandom() * state.dispersion,
            y: centerA.y + gaussianRandom() * state.dispersion,
            label: 0, // 類別 A
        });
    }

    // 類別 B（標籤 1）：右下區域
    const centerB = { x: CONFIG.CANVAS_WIDTH * 0.7, y: CONFIG.CANVAS_HEIGHT * 0.65 };
    for (let i = 0; i < CONFIG.TRAINING_POINTS_PER_CLASS; i++) {
        state.trainingData.push({
            x: centerB.x + gaussianRandom() * state.dispersion,
            y: centerB.y + gaussianRandom() * state.dispersion,
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
 * 產生多項式特徵
 * Degree 1: [1, x, y]
 * Degree 2: [1, x, y, x^2, xy, y^2]
 */
function getPolynomialFeatures(x, y, degree) {
    // Normalize first
    const normX = x / CONFIG.CANVAS_WIDTH;
    const normY = y / CONFIG.CANVAS_HEIGHT;

    let features = [1]; // Bias term

    for (let d = 1; d <= degree; d++) {
        for (let i = 0; i <= d; i++) {
            const j = d - i;
            // x^i * y^j
            features.push(Math.pow(normX, i) * Math.pow(normY, j));
        }
    }
    return features;
}

/**
 * 預測機率
 */
function predict(x, y) {
    const features = getPolynomialFeatures(x, y, state.degree);

    // Support initialization if weights missing (e.g. before training)
    if (!state.weights || state.weights.length !== features.length) {
        return 0.5;
    }

    let z = 0;
    for (let i = 0; i < features.length; i++) {
        z += state.weights[i] * features[i];
    }
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

    // 顯示進度和損失面板
    showProgressPanel();
    showLossPanel();

    // 初始化權重
    const dummyFeatures = getPolynomialFeatures(0, 0, state.degree);
    state.weights = new Array(dummyFeatures.length).fill(0);

    const n = state.trainingData.length;

    for (let epoch = 0; epoch < state.epochs; epoch++) {
        // Init gradients
        let gradients = new Array(state.weights.length).fill(0);

        // 計算梯度
        for (const point of state.trainingData) {
            const features = getPolynomialFeatures(point.x, point.y, state.degree);
            const p = predict(point.x, point.y);
            const error = p - point.label;

            for (let j = 0; j < gradients.length; j++) {
                gradients[j] += error * features[j];
            }
        }

        // 更新權重
        for (let j = 0; j < state.weights.length; j++) {
            state.weights[j] -= state.learningRate * (gradients[j] / n);
        }

        // 記錄損失
        const loss = calculateLoss();
        state.lossHistory.push(loss);

        // 每 10 個 epoch 更新視覺化
        if (epoch % 10 === 0 || epoch === state.epochs - 1) {
            render();
            updateResultPanel();
            updateProgress(epoch + 1, state.epochs);
            drawLossCurve();
            // 給瀏覽器渲染時間
            await new Promise(resolve => setTimeout(resolve, 20));
        }
    }

    state.isTraining = false;
    state.isTrained = true;
    trainBtn.disabled = false;
    trainBtn.textContent = '🚀 開始訓練';

    // 更新最終損失資訊
    updateLossInfo();
    hideProgressPanel();

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
    state.weights = [];
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
    drawAxisLabels();
}

/**
 * 繪製座標軸標籤
 */
function drawAxisLabels() {
    const ctx = state.ctx;
    const w = CONFIG.CANVAS_WIDTH;
    const h = CONFIG.CANVAS_HEIGHT;

    ctx.fillStyle = 'rgba(148, 163, 184, 0.7)'; // text-secondary color
    ctx.font = '12px "Noto Sans TC", sans-serif';

    // X 軸標籤
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('特徵 x₁ →', w / 2, h - 20);

    // Y 軸標籤
    ctx.save();
    ctx.translate(15, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('← 特徵 x₂', 0, 0);
    ctx.restore();
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
    // Degree 1: 使用解析解繪製平滑直線 (效能最好)
    if (state.degree === 1 && state.weights.length >= 3) {
        const w0 = state.weights[0];
        const w1 = state.weights[1];
        const w2 = state.weights[2];

        // 避免除以零
        if (Math.abs(w2) < 0.001) {
            if (Math.abs(w1) > 0.001) {
                const xBoundary = (-w0 / w1) * CONFIG.CANVAS_WIDTH;
                drawBoundaryLine([{ x: xBoundary, y: 0 }, { x: xBoundary, y: CONFIG.CANVAS_HEIGHT }]);
            }
            return;
        }

        const points = [];
        // 取樣兩個點通常就足夠，但為了保險取樣兩端
        const x1 = 0;
        const y1 = (-(w0 + w1 * (x1 / CONFIG.CANVAS_WIDTH)) / w2) * CONFIG.CANVAS_HEIGHT;
        const x2 = CONFIG.CANVAS_WIDTH;
        const y2 = (-(w0 + w1 * (x2 / CONFIG.CANVAS_WIDTH)) / w2) * CONFIG.CANVAS_HEIGHT;

        drawBoundaryLine([{ x: x1, y: y1 }, { x: x2, y: y2 }]);
        return;
    }

    // Degree > 1: 使用 Marching Squares 演算法繪製等高線 (P=0.5)
    drawContour(0.5);
}

/**
 * 繪製邊界線段輔助函式
 */
function drawBoundaryLine(points) {
    if (points.length < 2) return;
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

/**
 * Marching Squares 演算法繪製等高線
 */
function drawContour(threshold) {
    const resolution = 10; // Grid cell size in pixels
    const cols = Math.ceil(CONFIG.CANVAS_WIDTH / resolution) + 1;
    const rows = Math.ceil(CONFIG.CANVAS_HEIGHT / resolution) + 1;

    // Pre-calculate values grid
    const grid = new Float32Array(cols * rows);
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            const x = i * resolution;
            const y = j * resolution;
            grid[j * cols + i] = predict(x, y);
        }
    }

    state.ctx.beginPath();
    state.ctx.strokeStyle = COLORS.decisionLine;
    state.ctx.lineWidth = 3;
    state.ctx.shadowColor = COLORS.decisionLine;
    state.ctx.shadowBlur = 10;

    // Helper to linear interpolate between two values to find boundary position
    // returns t (0 to 1)
    const getT = (v0, v1) => {
        const diff = v1 - v0;
        return Math.abs(diff) < 1e-6 ? 0.5 : (threshold - v0) / diff;
    };

    // Iterate over squares
    for (let j = 0; j < rows - 1; j++) {
        for (let i = 0; i < cols - 1; i++) {
            const x = i * resolution;
            const y = j * resolution;

            // Corner values
            const vBL = grid[(j + 1) * cols + i];       // Bottom-Left
            const vBR = grid[(j + 1) * cols + (i + 1)]; // Bottom-Right
            const vTR = grid[j * cols + (i + 1)];       // Top-Right
            const vTL = grid[j * cols + i];             // Top-Left

            // Binary state (1 if > threshold)
            const bBL = vBL >= threshold ? 1 : 0;
            const bBR = vBR >= threshold ? 1 : 0;
            const bTR = vTR >= threshold ? 1 : 0;
            const bTL = vTL >= threshold ? 1 : 0;

            // Calculate case index (0-15)
            // Bit order: TL, TR, BR, BL (8, 4, 2, 1)
            const caseIndex = (bTL << 3) | (bTR << 2) | (bBR << 1) | bBL;

            if (caseIndex === 0 || caseIndex === 15) continue; // All inside or all outside

            // Interpolated points on edges
            // Top edge (between TL and TR) h-edge
            const xTop = x + getT(vTL, vTR) * resolution;
            const yTop = y;

            // Right edge (Between TR and BR) v-edge
            const xRight = x + resolution;
            const yRight = y + getT(vTR, vBR) * resolution;

            // Bottom edge (Between BR and BL) h-edge
            const xBottomInterp = x + getT(vBL, vBR) * resolution;
            const yBottom = y + resolution;

            // Left edge (Between TL and BL) v-edge
            const xLeft = x;
            const yLeft = y + getT(vTL, vBL) * resolution;

            // Draw segments
            switch (caseIndex) {
                case 1: drawLine(xLeft, yLeft, xBottomInterp, yBottom); break; // BL
                case 2: drawLine(xBottomInterp, yBottom, xRight, yRight); break; // BR
                case 3: drawLine(xLeft, yLeft, xRight, yRight); break; // BL & BR (Horizontal)
                case 4: drawLine(xTop, yTop, xRight, yRight); break; // TR
                case 5:  // BL & TR (Saddle)
                    drawLine(xLeft, yLeft, xTop, yTop);
                    drawLine(xBottomInterp, yBottom, xRight, yRight);
                    break;
                case 6: drawLine(xTop, yTop, xBottomInterp, yBottom); break; // BR & TR (Vertical)
                case 7: drawLine(xLeft, yLeft, xTop, yTop); break; // All except TL
                case 8: drawLine(xLeft, yLeft, xTop, yTop); break; // TL
                case 9: drawLine(xTop, yTop, xBottomInterp, yBottom); break; // TL & BL (Vertical)
                case 10: // TL & BR (Saddle)
                    drawLine(xLeft, yLeft, xBottomInterp, yBottom);
                    drawLine(xTop, yTop, xRight, yRight);
                    break;
                case 11: drawLine(xTop, yTop, xRight, yRight); break; // All except TR
                case 12: drawLine(xLeft, yLeft, xRight, yRight); break; // TL & TR (Horizontal)
                case 13: drawLine(xBottomInterp, yBottom, xRight, yRight); break; // All except BR
                case 14: drawLine(xLeft, yLeft, xBottomInterp, yBottom); break; // All except BL
            }
        }
    }

    state.ctx.stroke();
    state.ctx.shadowBlur = 0;
}

function drawLine(x1, y1, x2, y2) {
    state.ctx.moveTo(x1, y1);
    state.ctx.lineTo(x2, y2);
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

/**
 * 格式化決策邊界方程式
 */
function formatEquation() {
    if (!state.weights || state.weights.length === 0) return '尚未訓練';

    const degree = state.degree;

    if (degree === 1 && state.weights.length >= 3) {
        // Linear: w0 + w1*x + w2*y = 0  =>  y = (-w1/w2)x + (-w0/w2)
        const w0 = state.weights[0];
        const w1 = state.weights[1];
        const w2 = state.weights[2];

        if (Math.abs(w2) < 0.01) {
            return `x = ${(-w0 / w1).toFixed(2)} (垂直線)`;
        }

        const slope = -w1 / w2;
        const intercept = -w0 / w2;

        let equation = `y = ${slope.toFixed(2)}x`;
        if (intercept >= 0) equation += ` + ${intercept.toFixed(2)}`;
        else equation += ` - ${Math.abs(intercept).toFixed(2)}`;

        return equation;
    }

    // For Degree > 1, solving for y is complex, use implicit form f(x,y)=0
    let parts = [];
    let weightIdx = 0;

    // Bias term
    const w0 = state.weights[weightIdx++];
    parts.push(`${w0.toFixed(2)}`);

    for (let d = 1; d <= degree; d++) {
        for (let i = 0; i <= d; i++) {
            const j = d - i;
            const w = state.weights[weightIdx++];
            if (Math.abs(w) < 0.01) continue;

            let term = '';
            if (i > 0) term += `x${i > 1 ? `<sup>${i}</sup>` : ''}`;
            if (j > 0) term += `y${j > 1 ? `<sup>${j}</sup>` : ''}`;

            const sign = w >= 0 ? ' + ' : ' - ';
            parts.push(`${sign}${Math.abs(w).toFixed(2)}${term}`);
        }
    }

    return `f(x, y) = ${parts.join('')} = 0 (隱函數)`;
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
    const equation = formatEquation();

    resultPanel.innerHTML = `
        <h3>📋 訓練結果</h3>
        <div class="result-content">
            <div class="result-header">
                <span class="result-label">準確率：</span>
                <span class="result-accuracy">${accuracy.toFixed(1)}%</span>
            </div>
            
            <div class="equation-block">
                <div class="equation-label">決策邊界方程式：</div>
                <div class="equation-text">${equation}</div>
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

// ===========================
// 損失曲線與進度顯示
// ===========================

/**
 * 顯示進度面板
 */
function showProgressPanel() {
    const panel = document.getElementById('progressPanel');
    if (panel) {
        panel.style.display = 'block';
        updateProgress(0, state.epochs);
    }
}

/**
 * 隱藏進度面板
 */
function hideProgressPanel() {
    const panel = document.getElementById('progressPanel');
    if (panel) {
        // 保留 2 秒後隱藏
        setTimeout(() => {
            panel.style.display = 'none';
        }, 2000);
    }
}

/**
 * 更新進度顯示
 */
function updateProgress(current, total) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressPercent = document.getElementById('progressPercent');

    if (progressBar && progressText && progressPercent) {
        const percent = Math.round((current / total) * 100);
        progressBar.style.width = percent + '%';
        progressText.textContent = `${current} / ${total} Epochs`;
        progressPercent.textContent = percent + '%';
    }
}

/**
 * 顯示損失曲線面板
 */
function showLossPanel() {
    const panel = document.getElementById('lossPanel');
    if (panel) {
        panel.style.display = 'block';
        // 初始化損失 canvas
        initLossCanvas();
    }
}

/**
 * 初始化損失曲線 Canvas
 */
function initLossCanvas() {
    const canvas = document.getElementById('lossCanvas');
    if (!canvas) return;

    const container = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = container.offsetWidth * dpr;
    canvas.height = container.offsetHeight * dpr;
    canvas.style.width = container.offsetWidth + 'px';
    canvas.style.height = container.offsetHeight + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
}

/**
 * 繪製損失曲線
 */
function drawLossCurve() {
    const canvas = document.getElementById('lossCanvas');
    if (!canvas || state.lossHistory.length === 0) return;

    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    const w = container.offsetWidth;
    const h = container.offsetHeight;

    // 清除畫布
    ctx.clearRect(0, 0, w, h);

    // 背景
    ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
    ctx.fillRect(0, 0, w, h);

    // 找出最大最小損失
    const maxLoss = Math.max(...state.lossHistory);
    const minLoss = Math.min(...state.lossHistory);
    const range = maxLoss - minLoss || 1;

    // 繪製曲線
    ctx.beginPath();
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2;

    const padding = 5;
    const chartW = w - padding * 2;
    const chartH = h - padding * 2;

    state.lossHistory.forEach((loss, i) => {
        const x = padding + (i / (state.lossHistory.length - 1 || 1)) * chartW;
        const y = padding + chartH - ((loss - minLoss) / range) * chartH;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();

    // 繪製最後一個點
    if (state.lossHistory.length > 0) {
        const lastLoss = state.lossHistory[state.lossHistory.length - 1];
        const lastX = padding + chartW;
        const lastY = padding + chartH - ((lastLoss - minLoss) / range) * chartH;

        ctx.beginPath();
        ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#22c55e';
        ctx.fill();
    }
}

/**
 * 更新損失資訊
 */
function updateLossInfo() {
    const initialLoss = document.getElementById('initialLoss');
    const finalLoss = document.getElementById('finalLoss');

    if (initialLoss && finalLoss && state.lossHistory.length > 0) {
        initialLoss.textContent = state.lossHistory[0].toFixed(4);
        finalLoss.textContent = state.lossHistory[state.lossHistory.length - 1].toFixed(4);
    }
}
