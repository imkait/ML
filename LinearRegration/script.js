/**
 * 線性回歸 (Linear Regression) & 多項式回歸 (Polynomial Regression)
 * 互動教學 - JavaScript 邏輯
 * 實作梯度下降法與視覺化
 */

// ===========================
// 全域設定與狀態
// ===========================
const CONFIG = {
    CANVAS_WIDTH: 600,
    CANVAS_HEIGHT: 450,
    POINT_RADIUS: 6,
    ANIMATION_SPEED: 20, // ms per step
};

// 顏色配置 (對應 CSS 變數)
const COLORS = {
    point: '#f43f5e',
    pointGlow: 'rgba(244, 63, 94, 0.4)',
    line: '#06b6d4',
    prediction: '#fbbf24',
    residual: 'rgba(255, 255, 255, 0.2)',
    grid: 'rgba(255, 255, 255, 0.05)',
    text: '#94a3b8'
};

// 狀態管理
let state = {
    points: [],         // 資料點 {x, y} ( normalized 0-1 )
    degree: 1,          // 多項式次數 (1=Linear, 2=Quadratic...)
    weights: [0, 0],    // 權重陣列 [w0, w1, w2...], y = w0 + w1*x + w2*x^2 ... 
    // 注意：這裡我們習慣用 w0 為截距 (bias)，w1 為 x係數
    learningRate: 0.05,
    isTraining: false,
    step: 0,
    loss: 0,
    animationId: null,
    mode: 'training',   // 'training' | 'prediction'
    predictionPoint: null, // mouse position for prediction

    // Canvas context
    canvas: null,
    ctx: null,
};

// ===========================
// 初始化
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    initControls();

    // 初始設定
    updateWeightsArray(); // 根據預設 degree 初始化 weights
    initStatusGrid();     // 根據 degree 初始化狀態面板格位

    generateRandomData();
    render();
});

/**
 * 初始化 Canvas
 */
function initCanvas() {
    state.canvas = document.getElementById('regressionCanvas');
    state.ctx = state.canvas.getContext('2d');

    // 處理高 DPI 螢幕
    const dpr = window.devicePixelRatio || 1;
    const rect = state.canvas.getBoundingClientRect();

    state.canvas.width = rect.width * dpr;
    state.canvas.height = rect.height * dpr;
    state.ctx.scale(dpr, dpr);

    // 設定樣式寬高
    state.canvas.style.width = rect.width + 'px';
    state.canvas.style.height = rect.height + 'px';

    CONFIG.CANVAS_WIDTH = rect.width;
    CONFIG.CANVAS_HEIGHT = rect.height;

    // 事件
    state.canvas.addEventListener('click', handleCanvasClick);
    state.canvas.addEventListener('mousemove', handleCanvasMove);
    state.canvas.addEventListener('mouseleave', () => {
        state.predictionPoint = null;
        render();
    });
}

/**
 * 初始化控制元件
 */
function initControls() {
    // 學習率滑桿
    const lrSlider = document.getElementById('learningRate');
    const lrValue = document.getElementById('lrValue');
    lrSlider.addEventListener('input', (e) => {
        state.learningRate = parseFloat(e.target.value);
        lrValue.textContent = state.learningRate.toFixed(3);
    });

    // Degree 下拉選單
    const degreeSelect = document.getElementById('polyDegree');
    degreeSelect.addEventListener('change', (e) => {
        const newDegree = parseInt(e.target.value);
        if (newDegree !== state.degree) {
            state.degree = newDegree;
            resetTraining(); // 切換模型複雜度應重置訓練
            updateWeightsArray();
            initStatusGrid();
        }
    });

    // 按鈕
    document.getElementById('resetBtn').addEventListener('click', () => {
        stopTraining();
        state.points = [];
        resetTrainingVars();
        render();
        updateStatusPanel();
    });

    document.getElementById('randomBtn').addEventListener('click', () => {
        generateRandomData();
        resetTrainingVars();
        render();
        updateStatusPanel();
    });

    const trainBtn = document.getElementById('trainBtn');
    trainBtn.addEventListener('click', toggleTraining);

    // 模式切換
    const modeBtns = document.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            modeBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            setMode(e.target.dataset.mode);
        });
    });
}

function updateWeightsArray() {
    // weights 的長度是 degree + 1 (w0, w1, ... wd)
    state.weights = new Array(state.degree + 1).fill(0);
    // 隨機初始化
    for (let i = 0; i < state.weights.length; i++) {
        state.weights[i] = Math.random() * 2 - 1;
    }
}

function initStatusGrid() {
    const grid = document.getElementById('statusGrid');
    // 保留前兩個 (Loss, Step)
    const lossHtml = `
        <div class="status-item">
            <div class="status-label">Loss (MSE)</div>
            <div class="status-value loss" id="lossValue">0.00</div>
        </div>`;
    const stepHtml = `
        <div class="status-item">
            <div class="status-label">迭代次數 (Step)</div>
            <div class="status-value" id="stepValue">0</div>
        </div>`;

    let weightsHtml = '';

    for (let i = state.degree; i >= 0; i--) {
        // 顯示 w_i 
        // 為了讓使用者容易理解，我們標示對應的項次
        // w0 -> Bias
        // w1 -> x
        // w2 -> x^2
        let label = `w<sub>${i}</sub> (x<sup>${i}</sup>)`;
        if (i === 0) label = `w<sub>0</sub> (Bias)`;
        if (i === 1) label = `w<sub>1</sub> (x)`;

        weightsHtml += `
            <div class="status-item">
                <div class="status-label">${label}</div>
                <div class="status-value slope" id="wValue${i}">0.00</div>
            </div>`;
    }

    grid.innerHTML = lossHtml + stepHtml + weightsHtml;
}

// ===========================
// 邏輯控制
// ===========================

function setMode(newMode) {
    state.mode = newMode;
    const canvasHint = document.getElementById('canvasHint');

    if (newMode === 'training') {
        canvasHint.textContent = '👆 點擊畫布新增資料點';
        stopTraining();
    } else {
        canvasHint.textContent = '👆 移動滑鼠查看預測結果';
        stopTraining();
    }
    render();
}

function resetTraining() {
    stopTraining();
    resetTrainingVars();
    render();
    updateStatusPanel();
}

function resetTrainingVars() {
    state.step = 0;
    state.loss = 0;
    updateWeightsArray(); // 重置權重
    calculateLoss();
}

/**
 * 預測函數 y = f(x)
 */
function predict(x) {
    let y = 0;
    for (let i = 0; i < state.weights.length; i++) {
        y += state.weights[i] * Math.pow(x, i);
    }
    return y;
}

function generateRandomData() {
    state.points = [];
    const numPoints = 20;

    // 為了讓特定 degree 模型有東西學，我們先產生一個符合該 degree 的真實函數
    // 雖然真實世界往往不知道函數，但教學上這樣比較有成就感

    let trueWeights = [];
    if (state.degree === 1) {
        // Linear: y = mx + b
        // 盡量在 0-1 區間內
        const m = Math.random() < 0.5 ? 0.5 : -0.5;
        const b = 0.5;
        trueWeights = [b, m];
    } else if (state.degree === 2) {
        // Parabola: y = a(x-h)^2 + k
        // 開口向上 a=2, 頂點 (0.5, 0.2)
        // y = 2(x^2 - x + 0.25) + 0.2 = 2x^2 - 2x + 0.7
        // 我們隨機化一下
        const a = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 2 + 1);
        const h = Math.random() * 0.4 + 0.3; // 0.3 ~ 0.7
        const k = Math.random() * 0.4 + 0.3;

        // Expansion: y = a(x-h)^2 + k = a(x^2 - 2hx + h^2) + k
        // = ax^2 - 2ahx + (ah^2 + k)
        // w2 = a
        // w1 = -2ah
        // w0 = ah^2 + k
        trueWeights = [
            a * h * h + k,
            -2 * a * h,
            a
        ];
    } else {
        // Degree >= 3
        // S型曲線 y = sin like or simple cubic
        // 簡單點： y = 4(x-0.5)^3 + 0.5
        // = 4(x^3 - 1.5x^2 + 0.75x - 0.125) + 0.5
        // = 4x^3 - 6x^2 + 3x - 0.5 + 0.5
        // = 4x^3 - 6x^2 + 3x

        // 加上隨機偏移
        trueWeights = [0.2, 1, -2, 2]; // 隨便給
    }

    for (let i = 0; i < numPoints; i++) {
        const x = Math.random();

        // 計算 True y
        let y = 0;
        for (let d = 0; d < trueWeights.length; d++) {
            y += trueWeights[d] * Math.pow(x, d);
        }

        // 加入雜訊
        const noise = (Math.random() * 2 - 1) * 0.1;
        y += noise;

        // Clamp to slightly wider range but keep valid
        // 這裡不 clamp 可能會跑到畫布外，但這其實也是學習的一部分
        y = Math.max(-0.2, Math.min(1.2, y));

        state.points.push({ x, y });
    }

    // 初始化我們的權重 (亂猜)
    resetTrainingVars(); // 這會呼叫 updateWeightsArray 隨機化
}

// ===========================
// 訓練邏輯 (Gradient Descent)
// ===========================

function toggleTraining() {
    if (state.isTraining) {
        stopTraining();
    } else {
        startTraining();
    }
}

function startTraining() {
    if (state.points.length < 2) {
        alert("請先新增至少兩個資料點！");
        return;
    }

    state.isTraining = true;
    const btn = document.getElementById('trainBtn');
    btn.textContent = '⏸ 暫停訓練';
    btn.classList.add('active');

    trainingLoop();
}

function stopTraining() {
    state.isTraining = false;
    const btn = document.getElementById('trainBtn');
    btn.textContent = '▶ 開始訓練';
    btn.classList.remove('active');

    if (state.animationId) {
        cancelAnimationFrame(state.animationId);
        state.animationId = null;
    }
}

function trainingLoop() {
    if (!state.isTraining) return;

    // 為了加速訓練視覺效果，每次 frame 多跑幾步
    for (let k = 0; k < 5; k++) {
        trainStep();
    }

    render();
    updateStatusPanel();

    state.animationId = requestAnimationFrame(trainingLoop);
}

function trainStep() {
    const n = state.points.length;
    if (n === 0) return;

    // 儲存每個 weight 的梯度總和
    let gradients = new Array(state.weights.length).fill(0);

    state.points.forEach(p => {
        const x = p.x;
        const y = p.y;

        // Prediction
        const guess = predict(x);
        const error = y - guess; // (y - y_hat)

        // Gradient for MSE = (1/n) * sum( (y - y_hat)^2 )
        // d(Loss)/dw_i = (2/n) * sum( (y - y_hat) * (-x^i) )
        //              = (-2/n) * sum( error * x^i )

        // Update rule: w_i = w_i - lr * gradient
        //                  = w_i - lr * (-2/n * sum...)
        //                  = w_i + lr * (2/n) * sum( error * x^i )

        // 這裡省略常數 2，因為可以被 learning rate 吸收

        for (let i = 0; i < state.weights.length; i++) {
            // gradient contribution from this point
            // term = error * x^i
            gradients[i] += error * Math.pow(x, i);
        }
    });

    // Update weights
    for (let i = 0; i < state.weights.length; i++) {
        // Average gradient
        const avgGrad = gradients[i] / n;
        state.weights[i] += state.learningRate * avgGrad;
    }

    state.step++;
    calculateLoss();
}

function calculateLoss() {
    if (state.points.length === 0) {
        state.loss = 0;
        return;
    }

    let sumSquaredError = 0;
    state.points.forEach(p => {
        const guess = predict(p.x);
        const error = p.y - guess;
        sumSquaredError += error * error;
    });

    state.loss = sumSquaredError / state.points.length;
}

// ===========================
// 互動處理
// ===========================

function handleCanvasClick(e) {
    if (state.mode !== 'training') return;

    const { x, y } = getMousePos(e);

    // Canvas y 軸向下，轉為數學座標 (0,0在左下)
    // 0 -> 1 (top), H -> 0 (bottom) => val = 1 - y/H

    const normX = x / CONFIG.CANVAS_WIDTH;
    const normY = 1 - (y / CONFIG.CANVAS_HEIGHT);

    state.points.push({ x: normX, y: normY });

    calculateLoss();
    render();
    updateStatusPanel();
}

function handleCanvasMove(e) {
    if (state.mode !== 'prediction') return;

    const { x } = getMousePos(e);
    const normX = x / CONFIG.CANVAS_WIDTH;

    // 計算預測值
    const normY = predict(normX);

    state.predictionPoint = { x: normX, y: normY };
    render();
}

function getMousePos(evt) {
    const rect = state.canvas.getBoundingClientRect();
    const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
    const scaleY = CONFIG.CANVAS_HEIGHT / rect.height;

    return {
        x: (evt.clientX - rect.left) * scaleX,
        y: (evt.clientY - rect.top) * scaleY
    };
}


// ===========================
// 渲染邏輯
// ===========================

function render() {
    clearCanvas();
    drawGrid();
    drawPoints();
    drawRegressionCurve();

    if (state.mode === 'prediction' && state.predictionPoint) {
        drawPrediction();
    }
}

function clearCanvas() {
    const gradient = state.ctx.createLinearGradient(0, 0, 0, CONFIG.CANVAS_HEIGHT);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');

    state.ctx.fillStyle = gradient;
    state.ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
}

function toCanvasX(normX) {
    return normX * CONFIG.CANVAS_WIDTH;
}

function toCanvasY(normY) {
    return CONFIG.CANVAS_HEIGHT - (normY * CONFIG.CANVAS_HEIGHT);
}

function drawGrid() {
    state.ctx.strokeStyle = COLORS.grid;
    state.ctx.lineWidth = 1;

    for (let i = 0; i <= 10; i++) {
        const pos = i / 10;

        const x = toCanvasX(pos);
        state.ctx.beginPath();
        state.ctx.moveTo(x, 0);
        state.ctx.lineTo(x, CONFIG.CANVAS_HEIGHT);
        state.ctx.stroke();

        const y = toCanvasY(pos);
        state.ctx.beginPath();
        state.ctx.moveTo(0, y);
        state.ctx.lineTo(CONFIG.CANVAS_WIDTH, y);
        state.ctx.stroke();
    }
}

function drawPoints() {
    state.points.forEach(p => {
        const cx = toCanvasX(p.x);
        const cy = toCanvasY(p.y);

        // Residuals
        const predY = predict(p.x);
        const cyPred = toCanvasY(predY);

        // 只有當預測點在畫布內才畫誤差線，避免視覺混亂
        if (cyPred >= -50 && cyPred <= CONFIG.CANVAS_HEIGHT + 50) {
            state.ctx.beginPath();
            state.ctx.moveTo(cx, cy);
            state.ctx.lineTo(cx, cyPred);
            state.ctx.strokeStyle = COLORS.residual;
            state.ctx.setLineDash([4, 4]);
            state.ctx.lineWidth = 1;
            state.ctx.stroke();
            state.ctx.setLineDash([]);
        }

        // Glow
        state.ctx.beginPath();
        state.ctx.arc(cx, cy, CONFIG.POINT_RADIUS + 4, 0, Math.PI * 2);
        state.ctx.fillStyle = COLORS.pointGlow;
        state.ctx.fill();

        // Point
        state.ctx.beginPath();
        state.ctx.arc(cx, cy, CONFIG.POINT_RADIUS, 0, Math.PI * 2);
        state.ctx.fillStyle = COLORS.point;
        state.ctx.fill();
    });
}

function drawRegressionCurve() {
    state.ctx.strokeStyle = COLORS.line;
    state.ctx.lineWidth = 3;
    state.ctx.lineCap = 'round';

    state.ctx.beginPath();

    // 採樣點數，越多越平滑
    const steps = 100;

    for (let i = 0; i <= steps; i++) {
        const normX = i / steps;
        const normY = predict(normX);

        const cx = toCanvasX(normX);
        const cy = toCanvasY(normY);

        if (i === 0) {
            state.ctx.moveTo(cx, cy);
        } else {
            state.ctx.lineTo(cx, cy);
        }
    }

    state.ctx.stroke();
}

function drawPrediction() {
    const p = state.predictionPoint;
    const cx = toCanvasX(p.x);
    const cy = toCanvasY(p.y);

    // 繪製虛線
    state.ctx.strokeStyle = COLORS.prediction;
    state.ctx.setLineDash([5, 5]);
    state.ctx.lineWidth = 1;

    state.ctx.beginPath();
    state.ctx.moveTo(cx, cy);
    state.ctx.lineTo(cx, CONFIG.CANVAS_HEIGHT); // vertical
    state.ctx.stroke();

    state.ctx.beginPath();
    state.ctx.moveTo(cx, cy);
    state.ctx.lineTo(0, cy); // horizontal
    state.ctx.stroke();
    state.ctx.setLineDash([]);

    // Point
    state.ctx.beginPath();
    state.ctx.arc(cx, cy, CONFIG.POINT_RADIUS + 2, 0, Math.PI * 2);
    state.ctx.fillStyle = COLORS.prediction;
    state.ctx.fill();
    state.ctx.strokeStyle = '#fff';
    state.ctx.lineWidth = 2;
    state.ctx.stroke();

    // Label
    state.ctx.font = '12px monospace';
    state.ctx.fillStyle = '#fff';
    state.ctx.textAlign = 'left';

    // 顯示 x, y。如果靠右邊，字可以往左移
    let tx = cx + 10;
    if (cx > CONFIG.CANVAS_WIDTH - 100) tx = cx - 80;

    let ty = cy - 20;

    state.ctx.fillText(`x: ${p.x.toFixed(2)}`, tx, ty);
    state.ctx.fillText(`y: ${p.y.toFixed(2)}`, tx, ty + 15);
}

function updateStatusPanel() {
    document.getElementById('lossValue').textContent = state.loss.toFixed(6);
    document.getElementById('stepValue').textContent = state.step;

    // update weights
    for (let i = 0; i <= state.degree; i++) {
        const el = document.getElementById(`wValue${i}`);
        if (el) {
            el.textContent = state.weights[i].toFixed(4);
        }
    }
}
