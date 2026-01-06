/**
 * K-Means 聚類演算法互動教學 - JavaScript 邏輯
 */

// ===========================
// 全域設定與狀態
// ===========================
const CONFIG = {
    CANVAS_WIDTH: 600,
    CANVAS_HEIGHT: 500,
    POINT_RADIUS: 5,
    CENTROID_RADIUS: 12,
    POINT_COUNT: 150,
    ANIMATION_SPEED: 500, // ms
};

// 顏色配置 (對應 CSS 變數)
const COLORS = [
    { main: '#f43f5e', region: 'rgba(244, 63, 94, 0.15)' }, // Cluster 1
    { main: '#06b6d4', region: 'rgba(6, 182, 212, 0.15)' }, // Cluster 2
    { main: '#10b981', region: 'rgba(16, 185, 129, 0.15)' }, // Cluster 3
    { main: '#f59e0b', region: 'rgba(245, 158, 11, 0.15)' }, // Cluster 4
    { main: '#8b5cf6', region: 'rgba(139, 92, 246, 0.15)' }, // Cluster 5
    { main: '#ec4899', region: 'rgba(236, 72, 153, 0.15)' }, // Cluster 6
];

// 演算法狀態
const ALGO_STATE = {
    IDLE: 'idle',
    INIT: 'init',
    ASSIGN: 'assign',
    UPDATE: 'update',
    CONVERGED: 'converged'
};

let state = {
    k: 3,
    data: [],       // Array of {x, y, clusterIndex}
    centroids: [],  // Array of {x, y, color}
    iteration: 0,
    algoState: ALGO_STATE.IDLE,
    isAutoRunning: false,
    autoRunTimer: null,
    canvas: null,
    ctx: null,
};

// ===========================
// 初始化與 DOM 事件
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    initControls();
    generateRandomData();
    updateUI();
});

function initCanvas() {
    state.canvas = document.getElementById('kmeansCanvas');
    state.ctx = state.canvas.getContext('2d');

    const dpr = window.devicePixelRatio || 1;
    const rect = state.canvas.getBoundingClientRect();
    state.canvas.width = rect.width * dpr;
    state.canvas.height = rect.height * dpr;
    state.ctx.scale(dpr, dpr);

    CONFIG.CANVAS_WIDTH = rect.width;
    CONFIG.CANVAS_HEIGHT = rect.height;

    // 確保 CSS 顯示正確
    state.canvas.style.width = rect.width + 'px';
    state.canvas.style.height = rect.height + 'px';

    render();
}

function initControls() {
    const kSlider = document.getElementById('kSlider');
    const kValue = document.getElementById('kValue');
    const nextStepBtn = document.getElementById('nextStepBtn');
    const autoRunBtn = document.getElementById('autoRunBtn');
    const randomDataBtn = document.getElementById('randomDataBtn');
    const resetBtn = document.getElementById('resetBtn');

    kSlider.addEventListener('input', (e) => {
        state.k = parseInt(e.target.value);
        kValue.textContent = state.k;
        resetAlgorithm();
    });

    nextStepBtn.addEventListener('click', () => {
        performNextStep();
    });

    autoRunBtn.addEventListener('click', () => {
        toggleAutoRun();
    });

    randomDataBtn.addEventListener('click', () => {
        generateRandomData();
        resetAlgorithm();
    });

    resetBtn.addEventListener('click', () => {
        resetAlgorithm();
    });
}

// ===========================
// 邏輯核心
// ===========================

function generateRandomData() {
    state.data = [];
    // 隨機生成 3-4 個高斯分佈中心，讓資料有點群聚感，但又不完全分開
    const centers = [];
    const numCenters = Math.floor(Math.random() * 3) + 2;

    for (let i = 0; i < numCenters; i++) {
        centers.push({
            x: Math.random() * (CONFIG.CANVAS_WIDTH * 0.8) + CONFIG.CANVAS_WIDTH * 0.1,
            y: Math.random() * (CONFIG.CANVAS_HEIGHT * 0.8) + CONFIG.CANVAS_HEIGHT * 0.1
        });
    }

    for (let i = 0; i < CONFIG.POINT_COUNT; i++) {
        // 隨機選一個中心
        const center = centers[Math.floor(Math.random() * centers.length)];
        // 加入雜訊
        state.data.push({
            x: center.x + gaussianRandom() * 60,
            y: center.y + gaussianRandom() * 60,
            clusterIndex: -1 // 未分配
        });
    }
    render();
}

function resetAlgorithm() {
    stopAutoRun();
    state.iteration = 0;
    state.algoState = ALGO_STATE.IDLE;
    state.centroids = [];
    // 重置所有點的歸屬
    state.data.forEach(p => p.clusterIndex = -1);
    updateUI();
    render();
}

function performNextStep() {
    switch (state.algoState) {
        case ALGO_STATE.IDLE:
        case ALGO_STATE.INIT:
            // 步驟 1: 初始化中心點
            initCentroids();
            state.algoState = ALGO_STATE.ASSIGN;
            break;

        case ALGO_STATE.ASSIGN:
            // 步驟 2: 分配資料點
            assignClusters();
            state.algoState = ALGO_STATE.UPDATE;
            break;

        case ALGO_STATE.UPDATE:
            // 步驟 3: 更新中心點
            const moved = updateCentroids();
            state.iteration++;

            if (!moved) {
                state.algoState = ALGO_STATE.CONVERGED;
                stopAutoRun();
            } else {
                state.algoState = ALGO_STATE.ASSIGN;
            }
            break;

        case ALGO_STATE.CONVERGED:
            // 已收斂，不做事
            break;
    }
    updateUI();
    render();
}

/**
 * 初始化 K 個隨機中心點
 */
function initCentroids() {
    state.centroids = [];
    // 簡單起見，隨機選擇 K 個資料點作為其始中心
    // 這樣可以避免空群集的問題 (K-Means++ 更好，但這個簡單易懂)
    const indices = new Set();
    while (indices.size < state.k) {
        indices.add(Math.floor(Math.random() * state.data.length));
    }

    Array.from(indices).forEach((idx, i) => {
        const point = state.data[idx];
        state.centroids.push({
            x: point.x,
            y: point.y,
            colorIndex: i
        });
    });
}

/**
 * 將每個點分配給最近的中心
 */
function assignClusters() {
    state.data.forEach(point => {
        let minDist = Infinity;
        let clusterIndex = -1;

        state.centroids.forEach((c, idx) => {
            const dist = euclideanDistance(point, c);
            if (dist < minDist) {
                minDist = dist;
                clusterIndex = idx;
            }
        });

        point.clusterIndex = clusterIndex;
    });
}

/**
 * 更新中心點位置到群集平均值
 * @returns {boolean} 是否有中心點移動
 */
function updateCentroids() {
    let moved = false;
    const threshold = 1.0; // 移動距離小於此值視為停止

    state.centroids.forEach((c, idx) => {
        // 找出屬於該群集的所有點
        const clusterPoints = state.data.filter(p => p.clusterIndex === idx);

        if (clusterPoints.length > 0) {
            // 計算平均
            const sumX = clusterPoints.reduce((sum, p) => sum + p.x, 0);
            const sumY = clusterPoints.reduce((sum, p) => sum + p.y, 0);
            const newX = sumX / clusterPoints.length;
            const newY = sumY / clusterPoints.length;

            // 檢查移動距離
            const dist = Math.sqrt(Math.pow(newX - c.x, 2) + Math.pow(newY - c.y, 2));
            if (dist > threshold) {
                moved = true;
                c.x = newX;
                c.y = newY;
            }
        }
    });

    return moved;
}

// ===========================
// 自動執行
// ===========================

function toggleAutoRun() {
    if (state.isAutoRunning) {
        stopAutoRun();
    } else {
        startAutoRun();
    }
}

function startAutoRun() {
    if (state.algoState === ALGO_STATE.CONVERGED) {
        resetAlgorithm();
    }
    state.isAutoRunning = true;
    document.getElementById('autoRunBtn').textContent = '❚❚ 暫停';
    document.getElementById('autoRunBtn').classList.replace('btn-success', 'btn-warning');

    const loop = () => {
        if (!state.isAutoRunning) return;
        performNextStep();
        if (state.algoState !== ALGO_STATE.CONVERGED) {
            state.autoRunTimer = setTimeout(loop, CONFIG.ANIMATION_SPEED);
        }
    };
    loop();
}

function stopAutoRun() {
    state.isAutoRunning = false;
    clearTimeout(state.autoRunTimer);
    document.getElementById('autoRunBtn').textContent = '▶ 自動執行';
    document.getElementById('autoRunBtn').classList.replace('btn-warning', 'btn-success');
}

// ===========================
// 輔助函數
// ===========================

function gaussianRandom() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function euclideanDistance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

function updateUI() {
    document.getElementById('iterationCount').textContent = state.iteration;

    const statusEl = document.getElementById('currentStatus');
    let statusText = '';
    let activeStepId = '';

    switch (state.algoState) {
        case ALGO_STATE.IDLE:
            statusText = '等待開始';
            activeStepId = 'step-init';
            break;
        case ALGO_STATE.INIT:
            statusText = '初始化完成';
            activeStepId = 'step-assign';
            break;
        case ALGO_STATE.ASSIGN:
            statusText = '資料分配完成';
            activeStepId = 'step-update';
            break;
        case ALGO_STATE.UPDATE:
            statusText = '中心點更新完成';
            activeStepId = 'step-check'; // Check logic is implicit in Update state button flow
            break;
        case ALGO_STATE.CONVERGED:
            statusText = '🎉 已收斂！';
            activeStepId = 'step-check';
            break;
    }
    statusEl.textContent = statusText;

    // 更新步驟高亮
    document.querySelectorAll('.step-item').forEach(el => el.classList.remove('active'));
    if (activeStepId) {
        const stepEl = document.getElementById(activeStepId);
        if (stepEl) stepEl.classList.add('active');

        // 特殊處理：如果在 UPDATE 狀態下，下一步是 Check/Assign
        // 為了讓教學順暢，我們將步驟顯示 logic 簡化：
        // assign -> update -> check (loop)
    }
}

// ===========================
// 渲染
// ===========================

function render() {
    state.ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // 1. 繪製背景區域 (Voronoi 效果)
    if (state.centroids.length > 0) {
        drawVoronoiRegions();
    }

    // 2. 繪製連接線 (選擇性，當點被分配時)
    if (state.algoState === ALGO_STATE.ASSIGN || state.algoState === ALGO_STATE.UPDATE || state.algoState === ALGO_STATE.CONVERGED) {
        drawConnectionLines();
    }

    // 3. 繪製資料點
    drawPoints();

    // 4. 繪製中心點
    if (state.centroids.length > 0) {
        drawCentroids();
    }
}

// 使用像素掃描法繪製 Voronoi 區域 (效能較低但實作簡單直觀)
// 為了優化，我們可以使用較大的像素區塊 (例如 4x4)
function drawVoronoiRegions() {
    const blockSize = 4;
    for (let x = 0; x < CONFIG.CANVAS_WIDTH; x += blockSize) {
        for (let y = 0; y < CONFIG.CANVAS_HEIGHT; y += blockSize) {
            // 找出最近的 centroid
            let minDist = Infinity;
            let closestIndex = -1;

            // 下採樣點中心
            const px = x + blockSize / 2;
            const py = y + blockSize / 2;

            for (let i = 0; i < state.centroids.length; i++) {
                const dist = Math.pow(px - state.centroids[i].x, 2) + Math.pow(py - state.centroids[i].y, 2);
                if (dist < minDist) {
                    minDist = dist;
                    closestIndex = i;
                }
            }

            if (closestIndex !== -1) {
                state.ctx.fillStyle = COLORS[state.centroids[closestIndex].colorIndex].region;
                state.ctx.fillRect(x, y, blockSize, blockSize);
            }
        }
    }
}

function drawPoints() {
    state.data.forEach(p => {
        state.ctx.beginPath();
        state.ctx.arc(p.x, p.y, CONFIG.POINT_RADIUS, 0, Math.PI * 2);

        if (p.clusterIndex === -1) {
            state.ctx.fillStyle = '#94a3b8'; // 未分配顏色
        } else {
            const colorIdx = state.centroids[p.clusterIndex].colorIndex;
            state.ctx.fillStyle = COLORS[colorIdx].main;
        }
        state.ctx.fill();

        // 白色邊框
        state.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        state.ctx.lineWidth = 1;
        state.ctx.stroke();
    });
}

function drawCentroids() {
    state.centroids.forEach((c, i) => {
        const color = COLORS[c.colorIndex].main;

        // 繪製 X 形狀
        state.ctx.save();
        state.ctx.translate(c.x, c.y);
        state.ctx.beginPath();

        // 外發光
        state.ctx.shadowColor = color;
        state.ctx.shadowblur = 15;

        state.ctx.strokeStyle = '#ffffff'; // 白芯
        state.ctx.lineWidth = 4;

        const size = CONFIG.CENTROID_RADIUS;
        state.ctx.moveTo(-size, -size);
        state.ctx.lineTo(size, size);
        state.ctx.moveTo(size, -size);
        state.ctx.lineTo(-size, size);
        state.ctx.stroke();

        // 外圈顏色
        state.ctx.strokeStyle = color;
        state.ctx.lineWidth = 2;
        state.ctx.stroke();

        state.ctx.restore();
    });
}

function drawConnectionLines() {
    state.ctx.lineWidth = 1;
    state.data.forEach(p => {
        if (p.clusterIndex !== -1) {
            const centroid = state.centroids[p.clusterIndex];
            const color = COLORS[centroid.colorIndex].main;

            state.ctx.beginPath();
            state.ctx.moveTo(p.x, p.y);
            state.ctx.lineTo(centroid.x, centroid.y);
            state.ctx.strokeStyle = color;
            state.ctx.globalAlpha = 0.15; // 很淡的線
            state.ctx.stroke();
            state.ctx.globalAlpha = 1.0;
        }
    });
}
