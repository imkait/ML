/**
 * 損失函數 (Loss Functions) 互動教學 - JavaScript 邏輯
 * 實作各種損失函數的視覺化與互動功能
 */

// ===========================
// 全域設定與狀態
// ===========================
const CONFIG = {
    CANVAS_WIDTH: 600,
    CANVAS_HEIGHT: 500,
    Y_HAT_MIN: -2,
    Y_HAT_MAX: 2,
    LOSS_MIN: 0,
    LOSS_MAX: 4,
    CURVE_LINE_WIDTH: 3,
};

// 顏色配置
const COLORS = {
    curve: '#f472b6',
    curveGlow: 'rgba(244, 114, 182, 0.4)',
    point: '#22d3ee',
    pointGlow: 'rgba(34, 211, 238, 0.4)',
    axis: 'rgba(255, 255, 255, 0.8)',
    grid: 'rgba(255, 255, 255, 0.08)',
    gridMajor: 'rgba(255, 255, 255, 0.15)',
    text: 'rgba(255, 255, 255, 0.6)',
    crosshair: 'rgba(251, 191, 36, 0.6)',
    yLine: 'rgba(34, 197, 94, 0.6)',
};

// 損失函數定義
const LOSS_FUNCTIONS = {
    mse: {
        name: 'MSE (均方誤差)',
        formula: 'L = (y - ŷ)²',
        formulaFull: 'L = (1/n) Σᵢ (yᵢ - ŷᵢ)²',
        usage: '迴歸問題',
        func: (y, yHat) => Math.pow(y - yHat, 2),
        yRange: [-2, 2],
        lossRange: [0, 4],
    },
    mae: {
        name: 'MAE (平均絕對誤差)',
        formula: 'L = |y - ŷ|',
        formulaFull: 'L = (1/n) Σᵢ |yᵢ - ŷᵢ|',
        usage: '迴歸問題（對異常值穩健）',
        func: (y, yHat) => Math.abs(y - yHat),
        yRange: [-2, 2],
        lossRange: [0, 4],
    },
    bce: {
        name: 'Binary Cross-Entropy',
        formula: 'L = -[y·log(ŷ) + (1-y)·log(1-ŷ)]',
        formulaFull: 'L = -(1/n) Σᵢ [yᵢ·log(ŷᵢ) + (1-yᵢ)·log(1-ŷᵢ)]',
        usage: '二元分類',
        func: (y, yHat) => {
            // 限制 yHat 在 (0, 1) 範圍內
            const eps = 1e-7;
            const p = Math.max(eps, Math.min(1 - eps, yHat));
            const yClip = Math.max(0, Math.min(1, y));
            return -(yClip * Math.log(p) + (1 - yClip) * Math.log(1 - p));
        },
        yRange: [0, 1],
        yHatRange: [0.01, 0.99],
        lossRange: [0, 5],
    },
    huber: {
        name: 'Huber Loss',
        formula: 'L = ½(y-ŷ)² if |y-ŷ|≤δ, else δ|y-ŷ|-½δ²',
        formulaFull: 'L = (1/n) Σᵢ Lδ(yᵢ, ŷᵢ)',
        usage: '迴歸（對異常值穩健）',
        hasParam: true,
        paramName: 'δ',
        func: (y, yHat, delta = 1) => {
            const diff = Math.abs(y - yHat);
            if (diff <= delta) {
                return 0.5 * Math.pow(diff, 2);
            } else {
                return delta * diff - 0.5 * Math.pow(delta, 2);
            }
        },
        yRange: [-2, 2],
        lossRange: [0, 4],
    },
    hinge: {
        name: 'Hinge Loss',
        formula: 'L = max(0, 1 - y·ŷ)',
        formulaFull: 'L = (1/n) Σᵢ max(0, 1 - yᵢ·ŷᵢ)',
        usage: 'SVM 分類（y ∈ {-1, 1}）',
        func: (y, yHat) => {
            // For SVM, y should be -1 or 1
            return Math.max(0, 1 - y * yHat);
        },
        yRange: [-1, 1],
        yOptions: [-1, 1],
        lossRange: [0, 4],
    },
};

// 狀態管理
let state = {
    currentFunc: 'mse',
    y: 1,
    delta: 1,
    mouseX: null,
    mouseY: null,
    canvas: null,
    ctx: null,
};

// ===========================
// 初始化
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    initControls();
    updateFunctionInfo();
    render();
});

/**
 * 初始化 Canvas
 */
function initCanvas() {
    state.canvas = document.getElementById('lossCanvas');
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

    // 滑鼠事件
    state.canvas.addEventListener('mousemove', handleMouseMove);
    state.canvas.addEventListener('mouseleave', handleMouseLeave);
}

/**
 * 初始化控制元件
 */
function initControls() {
    const funcSelect = document.getElementById('funcSelect');
    const ySlider = document.getElementById('ySlider');
    const yValue = document.getElementById('yValue');
    const deltaSlider = document.getElementById('deltaSlider');
    const deltaValue = document.getElementById('deltaValue');
    const resetBtn = document.getElementById('resetBtn');

    // 函數選擇
    funcSelect.addEventListener('change', (e) => {
        state.currentFunc = e.target.value;
        updateYSliderRange();
        updateDeltaVisibility();
        updateFunctionInfo();
        render();
    });

    // y 值滑桿
    ySlider.addEventListener('input', (e) => {
        state.y = parseFloat(e.target.value);
        yValue.textContent = state.y.toFixed(2);
        document.getElementById('displayY').textContent = state.y.toFixed(2);
        render();
    });

    // delta 滑桿
    deltaSlider.addEventListener('input', (e) => {
        state.delta = parseFloat(e.target.value);
        deltaValue.textContent = state.delta.toFixed(2);
        render();
    });

    // 重置按鈕
    resetBtn.addEventListener('click', () => {
        state.y = 1;
        state.delta = 1;
        ySlider.value = 1;
        yValue.textContent = '1.00';
        deltaSlider.value = 1;
        deltaValue.textContent = '1.00';
        document.getElementById('displayY').textContent = '1.00';
        render();
    });

    // 初始化
    updateYSliderRange();
    updateDeltaVisibility();
}

/**
 * 更新 Y 滑桿範圍
 */
function updateYSliderRange() {
    const funcDef = LOSS_FUNCTIONS[state.currentFunc];
    const ySlider = document.getElementById('ySlider');
    const yValue = document.getElementById('yValue');
    const sliderLabels = ySlider.parentElement.querySelector('.slider-labels');

    if (funcDef.yOptions) {
        // Hinge Loss: y 只能是 -1 或 1
        ySlider.min = -1;
        ySlider.max = 1;
        ySlider.step = 2;
        state.y = 1;
        ySlider.value = 1;
        sliderLabels.innerHTML = '<span>-1</span><span>1</span>';
    } else if (funcDef.yRange) {
        ySlider.min = funcDef.yRange[0];
        ySlider.max = funcDef.yRange[1];
        ySlider.step = 0.1;
        sliderLabels.innerHTML = `<span>${funcDef.yRange[0]}</span><span>${funcDef.yRange[1]}</span>`;

        // 如果當前值超出範圍，調整
        if (state.y < funcDef.yRange[0] || state.y > funcDef.yRange[1]) {
            state.y = (funcDef.yRange[0] + funcDef.yRange[1]) / 2;
            ySlider.value = state.y;
        }
    }

    yValue.textContent = state.y.toFixed(2);
    document.getElementById('displayY').textContent = state.y.toFixed(2);
}

/**
 * 更新 delta 參數可見性
 */
function updateDeltaVisibility() {
    const funcDef = LOSS_FUNCTIONS[state.currentFunc];
    const deltaContainer = document.getElementById('deltaContainer');

    if (funcDef.hasParam) {
        deltaContainer.classList.remove('hidden');
    } else {
        deltaContainer.classList.add('hidden');
    }
}

/**
 * 更新函數資訊顯示
 */
function updateFunctionInfo() {
    const funcDef = LOSS_FUNCTIONS[state.currentFunc];

    document.getElementById('formulaDisplay').textContent = funcDef.formula;
    document.getElementById('formulaFullDisplay').textContent = funcDef.formulaFull;
    document.getElementById('usageDisplay').textContent = funcDef.usage;

    // 更新損失範圍
    if (funcDef.lossRange) {
        CONFIG.LOSS_MAX = funcDef.lossRange[1];
    }

    // 更新 yHat 範圍
    if (funcDef.yHatRange) {
        CONFIG.Y_HAT_MIN = funcDef.yHatRange[0];
        CONFIG.Y_HAT_MAX = funcDef.yHatRange[1];
    } else {
        CONFIG.Y_HAT_MIN = -2;
        CONFIG.Y_HAT_MAX = 2;
    }
}

// ===========================
// 座標轉換
// ===========================

/**
 * 數學座標轉螢幕座標
 */
function mathToScreen(yHat, loss) {
    const screenX = ((yHat - CONFIG.Y_HAT_MIN) / (CONFIG.Y_HAT_MAX - CONFIG.Y_HAT_MIN)) * CONFIG.CANVAS_WIDTH;
    const screenY = ((CONFIG.LOSS_MAX - loss) / (CONFIG.LOSS_MAX - CONFIG.LOSS_MIN)) * CONFIG.CANVAS_HEIGHT;
    return { x: screenX, y: screenY };
}

/**
 * 螢幕座標轉數學座標
 */
function screenToMath(screenX, screenY) {
    const yHat = CONFIG.Y_HAT_MIN + (screenX / CONFIG.CANVAS_WIDTH) * (CONFIG.Y_HAT_MAX - CONFIG.Y_HAT_MIN);
    const loss = CONFIG.LOSS_MAX - (screenY / CONFIG.CANVAS_HEIGHT) * (CONFIG.LOSS_MAX - CONFIG.LOSS_MIN);
    return { yHat, loss };
}

// ===========================
// 事件處理
// ===========================

/**
 * 處理滑鼠移動
 */
function handleMouseMove(event) {
    const rect = state.canvas.getBoundingClientRect();
    state.mouseX = event.clientX - rect.left;
    state.mouseY = event.clientY - rect.top;

    updateValueDisplay();
    render();
}

/**
 * 處理滑鼠離開
 */
function handleMouseLeave() {
    state.mouseX = null;
    state.mouseY = null;
    render();
}

/**
 * 更新數值顯示
 */
function updateValueDisplay() {
    if (state.mouseX === null) return;

    const math = screenToMath(state.mouseX, state.mouseY);
    const funcDef = LOSS_FUNCTIONS[state.currentFunc];

    const loss = funcDef.func(state.y, math.yHat, state.delta);

    document.getElementById('displayYHat').textContent = math.yHat.toFixed(2);
    document.getElementById('displayLoss').textContent = loss.toFixed(4);
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
    drawAxes();
    drawYLine();
    drawCurve();
    drawCrosshair();
    drawLegend();
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
 * 繪製網格
 */
function drawGrid() {
    state.ctx.lineWidth = 1;

    // 次要網格線
    state.ctx.strokeStyle = COLORS.grid;
    const yHatStep = (CONFIG.Y_HAT_MAX - CONFIG.Y_HAT_MIN) / 8;
    for (let yHat = CONFIG.Y_HAT_MIN; yHat <= CONFIG.Y_HAT_MAX; yHat += yHatStep) {
        const screen = mathToScreen(yHat, 0);
        state.ctx.beginPath();
        state.ctx.moveTo(screen.x, 0);
        state.ctx.lineTo(screen.x, CONFIG.CANVAS_HEIGHT);
        state.ctx.stroke();
    }

    const lossStep = CONFIG.LOSS_MAX / 8;
    for (let loss = 0; loss <= CONFIG.LOSS_MAX; loss += lossStep) {
        const screen = mathToScreen(0, loss);
        state.ctx.beginPath();
        state.ctx.moveTo(0, screen.y);
        state.ctx.lineTo(CONFIG.CANVAS_WIDTH, screen.y);
        state.ctx.stroke();
    }

    // 主要網格線
    state.ctx.strokeStyle = COLORS.gridMajor;
    for (let yHat = Math.ceil(CONFIG.Y_HAT_MIN); yHat <= CONFIG.Y_HAT_MAX; yHat++) {
        const screen = mathToScreen(yHat, 0);
        state.ctx.beginPath();
        state.ctx.moveTo(screen.x, 0);
        state.ctx.lineTo(screen.x, CONFIG.CANVAS_HEIGHT);
        state.ctx.stroke();
    }

    for (let loss = 0; loss <= CONFIG.LOSS_MAX; loss++) {
        const screen = mathToScreen(0, loss);
        state.ctx.beginPath();
        state.ctx.moveTo(0, screen.y);
        state.ctx.lineTo(CONFIG.CANVAS_WIDTH, screen.y);
        state.ctx.stroke();
    }
}

/**
 * 繪製座標軸
 */
function drawAxes() {
    state.ctx.strokeStyle = COLORS.axis;
    state.ctx.lineWidth = 2;

    // X 軸（底部，Loss = 0）
    const xAxisY = mathToScreen(0, 0).y;
    state.ctx.beginPath();
    state.ctx.moveTo(0, xAxisY);
    state.ctx.lineTo(CONFIG.CANVAS_WIDTH, xAxisY);
    state.ctx.stroke();

    // Y 軸（yHat = 0 的位置，如果在範圍內）
    if (CONFIG.Y_HAT_MIN <= 0 && CONFIG.Y_HAT_MAX >= 0) {
        const yAxisX = mathToScreen(0, 0).x;
        state.ctx.beginPath();
        state.ctx.moveTo(yAxisX, 0);
        state.ctx.lineTo(yAxisX, CONFIG.CANVAS_HEIGHT);
        state.ctx.stroke();
    }

    // 軸標籤
    state.ctx.fillStyle = COLORS.text;
    state.ctx.font = '12px Noto Sans TC';
    state.ctx.textAlign = 'center';
    state.ctx.textBaseline = 'top';

    // X 軸標籤（ŷ 值）
    for (let yHat = Math.ceil(CONFIG.Y_HAT_MIN); yHat <= CONFIG.Y_HAT_MAX; yHat++) {
        const screen = mathToScreen(yHat, 0);
        state.ctx.fillText(yHat.toString(), screen.x, xAxisY + 5);
    }

    // Y 軸標籤（Loss 值）
    state.ctx.textAlign = 'left';
    state.ctx.textBaseline = 'middle';
    for (let loss = 0; loss <= CONFIG.LOSS_MAX; loss++) {
        const screen = mathToScreen(CONFIG.Y_HAT_MIN, loss);
        state.ctx.fillText(loss.toString(), 5, screen.y);
    }

    // 軸名稱
    state.ctx.font = '14px Noto Sans TC';
    state.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    state.ctx.textAlign = 'center';
    state.ctx.fillText('預測值 ŷ', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT - 10);

    state.ctx.save();
    state.ctx.translate(20, CONFIG.CANVAS_HEIGHT / 2);
    state.ctx.rotate(-Math.PI / 2);
    state.ctx.fillText('損失 L', 0, 0);
    state.ctx.restore();
}

/**
 * 繪製真實值 y 的參考線
 */
function drawYLine() {
    const funcDef = LOSS_FUNCTIONS[state.currentFunc];

    // 只在 MSE、MAE、Huber 時畫真實值線
    if (['mse', 'mae', 'huber'].includes(state.currentFunc)) {
        if (state.y >= CONFIG.Y_HAT_MIN && state.y <= CONFIG.Y_HAT_MAX) {
            const screen = mathToScreen(state.y, 0);

            state.ctx.strokeStyle = COLORS.yLine;
            state.ctx.lineWidth = 2;
            state.ctx.setLineDash([6, 4]);

            state.ctx.beginPath();
            state.ctx.moveTo(screen.x, 0);
            state.ctx.lineTo(screen.x, CONFIG.CANVAS_HEIGHT);
            state.ctx.stroke();

            state.ctx.setLineDash([]);

            // 標籤
            state.ctx.fillStyle = 'rgba(34, 197, 94, 0.9)';
            state.ctx.font = '12px Noto Sans TC';
            state.ctx.textAlign = 'center';
            state.ctx.fillText(`y=${state.y.toFixed(1)}`, screen.x, 15);
        }
    }
}

/**
 * 繪製損失曲線
 */
function drawCurve() {
    const funcDef = LOSS_FUNCTIONS[state.currentFunc];
    const step = (CONFIG.Y_HAT_MAX - CONFIG.Y_HAT_MIN) / CONFIG.CANVAS_WIDTH;

    // 發光效果
    state.ctx.shadowColor = COLORS.curveGlow;
    state.ctx.shadowBlur = 15;
    state.ctx.strokeStyle = COLORS.curve;
    state.ctx.lineWidth = CONFIG.CURVE_LINE_WIDTH;
    state.ctx.lineCap = 'round';
    state.ctx.lineJoin = 'round';

    state.ctx.beginPath();
    let first = true;

    for (let yHat = CONFIG.Y_HAT_MIN; yHat <= CONFIG.Y_HAT_MAX; yHat += step) {
        const loss = funcDef.func(state.y, yHat, state.delta);
        const screen = mathToScreen(yHat, loss);

        // 限制在畫布範圍內
        if (screen.y >= -50 && screen.y <= CONFIG.CANVAS_HEIGHT + 50) {
            if (first) {
                state.ctx.moveTo(screen.x, screen.y);
                first = false;
            } else {
                state.ctx.lineTo(screen.x, screen.y);
            }
        } else {
            first = true;
        }
    }

    state.ctx.stroke();
    state.ctx.shadowBlur = 0;
}

/**
 * 繪製十字線與數值點
 */
function drawCrosshair() {
    if (state.mouseX === null) return;

    const math = screenToMath(state.mouseX, state.mouseY);
    const funcDef = LOSS_FUNCTIONS[state.currentFunc];
    const loss = funcDef.func(state.y, math.yHat, state.delta);
    const lossScreen = mathToScreen(math.yHat, loss);

    // 垂直虛線
    state.ctx.strokeStyle = COLORS.crosshair;
    state.ctx.lineWidth = 1;
    state.ctx.setLineDash([4, 4]);

    state.ctx.beginPath();
    state.ctx.moveTo(state.mouseX, 0);
    state.ctx.lineTo(state.mouseX, CONFIG.CANVAS_HEIGHT);
    state.ctx.stroke();

    // 水平虛線到損失值
    state.ctx.beginPath();
    state.ctx.moveTo(0, lossScreen.y);
    state.ctx.lineTo(CONFIG.CANVAS_WIDTH, lossScreen.y);
    state.ctx.stroke();

    state.ctx.setLineDash([]);

    // 損失值點
    state.ctx.beginPath();
    state.ctx.arc(lossScreen.x, lossScreen.y, 8, 0, Math.PI * 2);
    state.ctx.fillStyle = COLORS.point;
    state.ctx.fill();
    state.ctx.strokeStyle = 'white';
    state.ctx.lineWidth = 2;
    state.ctx.stroke();
}

/**
 * 繪製圖例
 */
function drawLegend() {
    const funcDef = LOSS_FUNCTIONS[state.currentFunc];
    const legendX = 60;
    const legendY = 15;

    state.ctx.font = '13px Noto Sans TC';

    // 損失曲線圖例
    state.ctx.beginPath();
    state.ctx.moveTo(legendX, legendY + 8);
    state.ctx.lineTo(legendX + 25, legendY + 8);
    state.ctx.strokeStyle = COLORS.curve;
    state.ctx.lineWidth = 3;
    state.ctx.stroke();

    state.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    state.ctx.textAlign = 'left';
    state.ctx.textBaseline = 'middle';
    state.ctx.fillText(`L(y, ŷ) - ${funcDef.name}`, legendX + 32, legendY + 8);
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
