/**
 * 激活函數 (Activation Functions) 互動教學 - JavaScript 邏輯
 * 實作各種激活函數的視覺化與互動功能
 */

// ===========================
// 全域設定與狀態
// ===========================
const CONFIG = {
    CANVAS_WIDTH: 600,
    CANVAS_HEIGHT: 500,
    X_MIN: -6,
    X_MAX: 6,
    Y_MIN: -2,
    Y_MAX: 2,
    GRID_STEP: 1,
    CURVE_LINE_WIDTH: 3,
    DERIVATIVE_LINE_WIDTH: 2,
};

// 顏色配置
const COLORS = {
    curve: '#22d3ee',
    curveGlow: 'rgba(34, 211, 238, 0.4)',
    derivative: '#f472b6',
    derivativeGlow: 'rgba(244, 114, 182, 0.4)',
    axis: 'rgba(255, 255, 255, 0.8)',
    grid: 'rgba(255, 255, 255, 0.08)',
    gridMajor: 'rgba(255, 255, 255, 0.15)',
    text: 'rgba(255, 255, 255, 0.6)',
    crosshair: 'rgba(251, 191, 36, 0.6)',
    dot: '#fbbf24',
};

// 激活函數定義
const ACTIVATION_FUNCTIONS = {
    sigmoid: {
        name: 'Sigmoid',
        formula: 'f(x) = 1 / (1 + e^(-x))',
        derivativeFormula: "f'(x) = f(x) · (1 - f(x))",
        range: '(0, 1)',
        hasParam: false,
        func: (x) => 1 / (1 + Math.exp(-x)),
        derivative: (x) => {
            const fx = 1 / (1 + Math.exp(-x));
            return fx * (1 - fx);
        },
    },
    tanh: {
        name: 'Tanh',
        formula: 'f(x) = (e^x - e^(-x)) / (e^x + e^(-x))',
        derivativeFormula: "f'(x) = 1 - f(x)²",
        range: '(-1, 1)',
        hasParam: false,
        func: (x) => Math.tanh(x),
        derivative: (x) => {
            const fx = Math.tanh(x);
            return 1 - fx * fx;
        },
    },
    relu: {
        name: 'ReLU',
        formula: 'f(x) = max(0, x)',
        derivativeFormula: "f'(x) = 0 if x<0 else 1",
        range: '[0, +∞)',
        hasParam: false,
        func: (x) => Math.max(0, x),
        derivative: (x) => (x > 0 ? 1 : 0),
    },
    leakyRelu: {
        name: 'Leaky ReLU',
        formula: 'f(x) = max(αx, x)',
        derivativeFormula: "f'(x) = α if x<0 else 1",
        range: '(-∞, +∞)',
        hasParam: true,
        paramName: 'α',
        paramDefault: 0.01,
        paramMin: 0.01,
        paramMax: 0.5,
        paramStep: 0.01,
        func: (x, alpha = 0.01) => (x > 0 ? x : alpha * x),
        derivative: (x, alpha = 0.01) => (x > 0 ? 1 : alpha),
    },
    elu: {
        name: 'ELU',
        formula: 'f(x) = x if x>0 else α(e^x - 1)',
        derivativeFormula: "f'(x) = 1 if x>0 else f(x)+α",
        range: '(-α, +∞)',
        hasParam: true,
        paramName: 'α',
        paramDefault: 1.0,
        paramMin: 0.1,
        paramMax: 2.0,
        paramStep: 0.1,
        func: (x, alpha = 1.0) => (x > 0 ? x : alpha * (Math.exp(x) - 1)),
        derivative: (x, alpha = 1.0) => (x > 0 ? 1 : alpha * Math.exp(x)),
    },
    swish: {
        name: 'Swish',
        formula: 'f(x) = x · sigmoid(x)',
        derivativeFormula: "f'(x) = f(x) + sigmoid(x)(1 - f(x))",
        range: '(-∞, +∞)',
        hasParam: false,
        func: (x) => x / (1 + Math.exp(-x)),
        derivative: (x) => {
            const sigmoid = 1 / (1 + Math.exp(-x));
            const swish = x * sigmoid;
            return swish + sigmoid * (1 - swish);
        },
    },
};

// 狀態管理
let state = {
    currentFunc: 'relu',
    param: 0.01,
    showDerivative: true,
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
    state.canvas = document.getElementById('activationCanvas');
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
    const paramSlider = document.getElementById('paramSlider');
    const paramValue = document.getElementById('paramValue');
    const showDerivative = document.getElementById('showDerivative');
    const resetViewBtn = document.getElementById('resetViewBtn');

    // 函數選擇
    funcSelect.addEventListener('change', (e) => {
        state.currentFunc = e.target.value;
        updateParamVisibility();
        updateFunctionInfo();
        render();
    });

    // 參數滑桿
    paramSlider.addEventListener('input', (e) => {
        state.param = parseFloat(e.target.value);
        paramValue.textContent = state.param.toFixed(2);
        render();
    });

    // 導函數顯示切換
    showDerivative.addEventListener('change', (e) => {
        state.showDerivative = e.target.checked;
        render();
    });

    // 重置視圖
    resetViewBtn.addEventListener('click', () => {
        CONFIG.X_MIN = -6;
        CONFIG.X_MAX = 6;
        CONFIG.Y_MIN = -2;
        CONFIG.Y_MAX = 2;
        render();
    });

    // 初始化參數顯示
    updateParamVisibility();
}

/**
 * 更新參數滑桿可見性
 */
function updateParamVisibility() {
    const funcDef = ACTIVATION_FUNCTIONS[state.currentFunc];
    const paramContainer = document.getElementById('paramContainer');
    const paramSlider = document.getElementById('paramSlider');
    const paramValue = document.getElementById('paramValue');
    const paramLabel = document.getElementById('paramLabel');

    if (funcDef.hasParam) {
        paramContainer.classList.remove('hidden');
        paramLabel.textContent = `${funcDef.paramName} 值`;
        paramSlider.min = funcDef.paramMin;
        paramSlider.max = funcDef.paramMax;
        paramSlider.step = funcDef.paramStep;
        paramSlider.value = funcDef.paramDefault;
        state.param = funcDef.paramDefault;
        paramValue.textContent = state.param.toFixed(2);
        
        // 更新滑桿標籤
        const sliderLabels = paramContainer.querySelector('.slider-labels');
        sliderLabels.innerHTML = `<span>${funcDef.paramMin}</span><span>${funcDef.paramMax}</span>`;
    } else {
        paramContainer.classList.add('hidden');
    }
}

/**
 * 更新函數資訊顯示
 */
function updateFunctionInfo() {
    const funcDef = ACTIVATION_FUNCTIONS[state.currentFunc];
    
    document.getElementById('formulaDisplay').textContent = funcDef.formula;
    document.getElementById('derivativeDisplay').textContent = funcDef.derivativeFormula;
    document.getElementById('rangeDisplay').textContent = funcDef.range;
}

// ===========================
// 座標轉換
// ===========================

/**
 * 數學座標轉螢幕座標
 */
function mathToScreen(x, y) {
    const screenX = ((x - CONFIG.X_MIN) / (CONFIG.X_MAX - CONFIG.X_MIN)) * CONFIG.CANVAS_WIDTH;
    const screenY = ((CONFIG.Y_MAX - y) / (CONFIG.Y_MAX - CONFIG.Y_MIN)) * CONFIG.CANVAS_HEIGHT;
    return { x: screenX, y: screenY };
}

/**
 * 螢幕座標轉數學座標
 */
function screenToMath(screenX, screenY) {
    const x = CONFIG.X_MIN + (screenX / CONFIG.CANVAS_WIDTH) * (CONFIG.X_MAX - CONFIG.X_MIN);
    const y = CONFIG.Y_MAX - (screenY / CONFIG.CANVAS_HEIGHT) * (CONFIG.Y_MAX - CONFIG.Y_MIN);
    return { x, y };
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
    const funcDef = ACTIVATION_FUNCTIONS[state.currentFunc];
    
    const fx = funcDef.func(math.x, state.param);
    const dfx = funcDef.derivative(math.x, state.param);
    
    document.getElementById('xValue').textContent = math.x.toFixed(2);
    document.getElementById('fxValue').textContent = fx.toFixed(4);
    document.getElementById('dfxValue').textContent = dfx.toFixed(4);
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
    drawCurve();
    if (state.showDerivative) {
        drawDerivativeCurve();
    }
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

    // 次要網格線（每 0.5 單位）
    state.ctx.strokeStyle = COLORS.grid;
    for (let x = Math.ceil(CONFIG.X_MIN); x <= CONFIG.X_MAX; x += 0.5) {
        if (x % 1 !== 0) {
            const screen = mathToScreen(x, 0);
            state.ctx.beginPath();
            state.ctx.moveTo(screen.x, 0);
            state.ctx.lineTo(screen.x, CONFIG.CANVAS_HEIGHT);
            state.ctx.stroke();
        }
    }
    for (let y = Math.ceil(CONFIG.Y_MIN); y <= CONFIG.Y_MAX; y += 0.5) {
        if (y % 1 !== 0) {
            const screen = mathToScreen(0, y);
            state.ctx.beginPath();
            state.ctx.moveTo(0, screen.y);
            state.ctx.lineTo(CONFIG.CANVAS_WIDTH, screen.y);
            state.ctx.stroke();
        }
    }

    // 主要網格線（每 1 單位）
    state.ctx.strokeStyle = COLORS.gridMajor;
    for (let x = Math.ceil(CONFIG.X_MIN); x <= CONFIG.X_MAX; x++) {
        if (x !== 0) {
            const screen = mathToScreen(x, 0);
            state.ctx.beginPath();
            state.ctx.moveTo(screen.x, 0);
            state.ctx.lineTo(screen.x, CONFIG.CANVAS_HEIGHT);
            state.ctx.stroke();
        }
    }
    for (let y = Math.ceil(CONFIG.Y_MIN); y <= CONFIG.Y_MAX; y++) {
        if (y !== 0) {
            const screen = mathToScreen(0, y);
            state.ctx.beginPath();
            state.ctx.moveTo(0, screen.y);
            state.ctx.lineTo(CONFIG.CANVAS_WIDTH, screen.y);
            state.ctx.stroke();
        }
    }
}

/**
 * 繪製座標軸
 */
function drawAxes() {
    state.ctx.strokeStyle = COLORS.axis;
    state.ctx.lineWidth = 2;

    // X 軸
    const xAxisY = mathToScreen(0, 0).y;
    if (xAxisY >= 0 && xAxisY <= CONFIG.CANVAS_HEIGHT) {
        state.ctx.beginPath();
        state.ctx.moveTo(0, xAxisY);
        state.ctx.lineTo(CONFIG.CANVAS_WIDTH, xAxisY);
        state.ctx.stroke();
    }

    // Y 軸
    const yAxisX = mathToScreen(0, 0).x;
    if (yAxisX >= 0 && yAxisX <= CONFIG.CANVAS_WIDTH) {
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

    // X 軸刻度標籤
    for (let x = Math.ceil(CONFIG.X_MIN); x <= CONFIG.X_MAX; x++) {
        if (x !== 0) {
            const screen = mathToScreen(x, 0);
            state.ctx.fillText(x.toString(), screen.x, xAxisY + 5);
        }
    }

    // Y 軸刻度標籤
    state.ctx.textAlign = 'right';
    state.ctx.textBaseline = 'middle';
    for (let y = Math.ceil(CONFIG.Y_MIN); y <= CONFIG.Y_MAX; y++) {
        if (y !== 0) {
            const screen = mathToScreen(0, y);
            state.ctx.fillText(y.toString(), yAxisX - 5, screen.y);
        }
    }

    // 原點標籤
    state.ctx.textAlign = 'right';
    state.ctx.textBaseline = 'top';
    const origin = mathToScreen(0, 0);
    state.ctx.fillText('0', origin.x - 5, origin.y + 5);
}

/**
 * 繪製函數曲線
 */
function drawCurve() {
    const funcDef = ACTIVATION_FUNCTIONS[state.currentFunc];
    const step = (CONFIG.X_MAX - CONFIG.X_MIN) / CONFIG.CANVAS_WIDTH;

    // 發光效果
    state.ctx.shadowColor = COLORS.curveGlow;
    state.ctx.shadowBlur = 15;
    state.ctx.strokeStyle = COLORS.curve;
    state.ctx.lineWidth = CONFIG.CURVE_LINE_WIDTH;
    state.ctx.lineCap = 'round';
    state.ctx.lineJoin = 'round';

    state.ctx.beginPath();
    let first = true;

    for (let x = CONFIG.X_MIN; x <= CONFIG.X_MAX; x += step) {
        const y = funcDef.func(x, state.param);
        const screen = mathToScreen(x, y);

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
 * 繪製導函數曲線
 */
function drawDerivativeCurve() {
    const funcDef = ACTIVATION_FUNCTIONS[state.currentFunc];
    const step = (CONFIG.X_MAX - CONFIG.X_MIN) / CONFIG.CANVAS_WIDTH;

    // 發光效果
    state.ctx.shadowColor = COLORS.derivativeGlow;
    state.ctx.shadowBlur = 10;
    state.ctx.strokeStyle = COLORS.derivative;
    state.ctx.lineWidth = CONFIG.DERIVATIVE_LINE_WIDTH;
    state.ctx.setLineDash([8, 4]);

    state.ctx.beginPath();
    let first = true;

    for (let x = CONFIG.X_MIN; x <= CONFIG.X_MAX; x += step) {
        const y = funcDef.derivative(x, state.param);
        const screen = mathToScreen(x, y);

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
    state.ctx.setLineDash([]);
    state.ctx.shadowBlur = 0;
}

/**
 * 繪製十字線與數值點
 */
function drawCrosshair() {
    if (state.mouseX === null) return;

    const math = screenToMath(state.mouseX, state.mouseY);
    const funcDef = ACTIVATION_FUNCTIONS[state.currentFunc];
    const fx = funcDef.func(math.x, state.param);
    const fxScreen = mathToScreen(math.x, fx);

    // 垂直虛線
    state.ctx.strokeStyle = COLORS.crosshair;
    state.ctx.lineWidth = 1;
    state.ctx.setLineDash([4, 4]);

    state.ctx.beginPath();
    state.ctx.moveTo(state.mouseX, 0);
    state.ctx.lineTo(state.mouseX, CONFIG.CANVAS_HEIGHT);
    state.ctx.stroke();

    // 水平虛線到函數值
    state.ctx.beginPath();
    state.ctx.moveTo(0, fxScreen.y);
    state.ctx.lineTo(CONFIG.CANVAS_WIDTH, fxScreen.y);
    state.ctx.stroke();

    state.ctx.setLineDash([]);

    // 函數值點
    state.ctx.beginPath();
    state.ctx.arc(fxScreen.x, fxScreen.y, 8, 0, Math.PI * 2);
    state.ctx.fillStyle = COLORS.dot;
    state.ctx.fill();
    state.ctx.strokeStyle = 'white';
    state.ctx.lineWidth = 2;
    state.ctx.stroke();

    // 導函數值點
    if (state.showDerivative) {
        const dfx = funcDef.derivative(math.x, state.param);
        const dfxScreen = mathToScreen(math.x, dfx);

        state.ctx.beginPath();
        state.ctx.arc(dfxScreen.x, dfxScreen.y, 6, 0, Math.PI * 2);
        state.ctx.fillStyle = COLORS.derivative;
        state.ctx.fill();
        state.ctx.strokeStyle = 'white';
        state.ctx.lineWidth = 2;
        state.ctx.stroke();
    }
}

/**
 * 繪製圖例
 */
function drawLegend() {
    const funcDef = ACTIVATION_FUNCTIONS[state.currentFunc];
    const legendX = 15;
    const legendY = 15;
    const lineHeight = 24;

    state.ctx.font = '13px Noto Sans TC';

    // 原函數圖例
    state.ctx.fillStyle = COLORS.curve;
    state.ctx.beginPath();
    state.ctx.moveTo(legendX, legendY + 8);
    state.ctx.lineTo(legendX + 25, legendY + 8);
    state.ctx.strokeStyle = COLORS.curve;
    state.ctx.lineWidth = 3;
    state.ctx.stroke();

    state.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    state.ctx.textAlign = 'left';
    state.ctx.textBaseline = 'middle';
    state.ctx.fillText(`f(x) - ${funcDef.name}`, legendX + 32, legendY + 8);

    // 導函數圖例
    if (state.showDerivative) {
        state.ctx.beginPath();
        state.ctx.moveTo(legendX, legendY + lineHeight + 8);
        state.ctx.lineTo(legendX + 25, legendY + lineHeight + 8);
        state.ctx.strokeStyle = COLORS.derivative;
        state.ctx.lineWidth = 2;
        state.ctx.setLineDash([6, 3]);
        state.ctx.stroke();
        state.ctx.setLineDash([]);

        state.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        state.ctx.fillText("f'(x) - 導函數", legendX + 32, legendY + lineHeight + 8);
    }
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
