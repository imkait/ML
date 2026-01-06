/**
 * KNN 演算法互動教學 - JavaScript 邏輯
 * 實作 K-最近鄰分類演算法與視覺化
 */

// ===========================
// 全域設定與狀態
// ===========================
const CONFIG = {
    CANVAS_WIDTH: 600,
    CANVAS_HEIGHT: 500,
    POINT_RADIUS: 10,
    TEST_POINT_RADIUS: 12,
    MIN_K: 1,
    MAX_K: 15,
    DEFAULT_K: 3,
    TRAINING_POINTS_PER_CLASS: 15, // 每個類別的訓練資料數量
};

// 顏色配置
const COLORS = {
    classA: '#f43f5e',
    classALight: 'rgba(244, 63, 94, 0.3)',
    classB: '#06b6d4',
    classBLight: 'rgba(6, 182, 212, 0.3)',
    testPoint: '#fbbf24',
    neighborLine: 'rgba(251, 191, 36, 0.6)',
    gridLine: 'rgba(255, 255, 255, 0.05)',
};

// 狀態管理
let state = {
    k: CONFIG.DEFAULT_K,
    trainingData: [],
    testPoints: [],
    canvas: null,
    ctx: null,
};

// ===========================
// 初始化
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    initControls();
    generateRandomData();
    render();
});

/**
 * 初始化 Canvas
 */
function initCanvas() {
    state.canvas = document.getElementById('knnCanvas');
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

    // 點擊事件
    state.canvas.addEventListener('click', handleCanvasClick);
}

/**
 * 初始化控制元件
 */
function initControls() {
    const kSlider = document.getElementById('kSlider');
    const kValue = document.getElementById('kValue');
    const resetBtn = document.getElementById('resetBtn');
    const randomBtn = document.getElementById('randomBtn');

    // K 值滑桿
    kSlider.addEventListener('input', (e) => {
        state.k = parseInt(e.target.value);
        kValue.textContent = state.k;

        // 重新計算所有測試點的分類
        if (state.testPoints.length > 0) {
            state.testPoints.forEach(point => {
                point.classification = classifyPoint(point);
            });
            render();
            updateResultPanel(state.testPoints[state.testPoints.length - 1]);
        }
    });

    // 重置按鈕
    resetBtn.addEventListener('click', () => {
        state.testPoints = [];
        render();
        resetResultPanel();
    });

    // 隨機資料按鈕
    randomBtn.addEventListener('click', () => {
        generateRandomData();
        state.testPoints = [];
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

    // 類別 A：以 (150, 150) 為中心的群集
    const centerA = { x: CONFIG.CANVAS_WIDTH * 0.25, y: CONFIG.CANVAS_HEIGHT * 0.35 };
    for (let i = 0; i < CONFIG.TRAINING_POINTS_PER_CLASS; i++) {
        state.trainingData.push({
            x: centerA.x + gaussianRandom() * 80,
            y: centerA.y + gaussianRandom() * 80,
            label: 'A',
        });
    }

    // 類別 B：以 (450, 350) 為中心的群集
    const centerB = { x: CONFIG.CANVAS_WIDTH * 0.75, y: CONFIG.CANVAS_HEIGHT * 0.65 };
    for (let i = 0; i < CONFIG.TRAINING_POINTS_PER_CLASS; i++) {
        state.trainingData.push({
            x: centerB.x + gaussianRandom() * 80,
            y: centerB.y + gaussianRandom() * 80,
            label: 'B',
        });
    }

    // 加入一些混合區域的點，使分類更有趣
    const mixCenter = { x: CONFIG.CANVAS_WIDTH * 0.5, y: CONFIG.CANVAS_HEIGHT * 0.5 };
    for (let i = 0; i < 5; i++) {
        state.trainingData.push({
            x: mixCenter.x + gaussianRandom() * 60,
            y: mixCenter.y + gaussianRandom() * 60,
            label: Math.random() > 0.5 ? 'A' : 'B',
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
// KNN 演算法核心
// ===========================

/**
 * 計算兩點間的歐幾里得距離
 */
function euclideanDistance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 對測試點進行 KNN 分類
 * @param {Object} testPoint - 測試點 {x, y}
 * @returns {Object} 分類結果
 */
function classifyPoint(testPoint) {
    // 計算到所有訓練資料的距離
    const distances = state.trainingData.map(trainPoint => ({
        point: trainPoint,
        distance: euclideanDistance(testPoint, trainPoint),
    }));

    // 按距離排序
    distances.sort((a, b) => a.distance - b.distance);

    // 取前 K 個最近鄰居
    const kNearest = distances.slice(0, state.k);

    // 統計各類別數量
    const votes = { A: 0, B: 0 };
    kNearest.forEach(neighbor => {
        votes[neighbor.point.label]++;
    });

    // 決定分類結果
    const predictedClass = votes.A >= votes.B ? 'A' : 'B';

    return {
        predictedClass,
        votes,
        kNearest,
    };
}

// ===========================
// 事件處理
// ===========================

/**
 * 處理畫布點擊事件
 */
function handleCanvasClick(event) {
    const rect = state.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // 確保點在畫布範圍內
    if (x < 0 || x > CONFIG.CANVAS_WIDTH || y < 0 || y > CONFIG.CANVAS_HEIGHT) {
        return;
    }

    // 建立新測試點
    const newTestPoint = { x, y };
    newTestPoint.classification = classifyPoint(newTestPoint);

    // 只保留最後一個測試點（可以改成保留多個）
    state.testPoints = [newTestPoint];

    render();
    updateResultPanel(newTestPoint);
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
    drawTrainingData();
    drawTestPoints();
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

    // 垂直線
    for (let x = 0; x <= CONFIG.CANVAS_WIDTH; x += gridSize) {
        state.ctx.beginPath();
        state.ctx.moveTo(x, 0);
        state.ctx.lineTo(x, CONFIG.CANVAS_HEIGHT);
        state.ctx.stroke();
    }

    // 水平線
    for (let y = 0; y <= CONFIG.CANVAS_HEIGHT; y += gridSize) {
        state.ctx.beginPath();
        state.ctx.moveTo(0, y);
        state.ctx.lineTo(CONFIG.CANVAS_WIDTH, y);
        state.ctx.stroke();
    }
}

/**
 * 繪製訓練資料點
 */
function drawTrainingData() {
    state.trainingData.forEach(point => {
        const color = point.label === 'A' ? COLORS.classA : COLORS.classB;
        const glowColor = point.label === 'A' ? COLORS.classALight : COLORS.classBLight;

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
    });
}

/**
 * 繪製測試點與最近鄰居連線
 */
function drawTestPoints() {
    state.testPoints.forEach(testPoint => {
        const classification = testPoint.classification;

        // 繪製 K 鄰居範圍圓圈
        if (classification && classification.kNearest && classification.kNearest.length > 0) {
            // 取得第 K 個鄰居的距離作為圓圈半徑
            const maxDistance = classification.kNearest[classification.kNearest.length - 1].distance;

            // 繪製範圍圓圈（填充）
            state.ctx.beginPath();
            state.ctx.arc(testPoint.x, testPoint.y, maxDistance, 0, Math.PI * 2);
            state.ctx.fillStyle = 'rgba(251, 191, 36, 0.08)';
            state.ctx.fill();

            // 繪製範圍圓圈（邊框）
            state.ctx.beginPath();
            state.ctx.arc(testPoint.x, testPoint.y, maxDistance, 0, Math.PI * 2);
            state.ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
            state.ctx.lineWidth = 2;
            state.ctx.setLineDash([8, 4]);
            state.ctx.stroke();
            state.ctx.setLineDash([]);
        }

        // 繪製到 K 個最近鄰居的連線
        if (classification && classification.kNearest) {
            classification.kNearest.forEach((neighbor, index) => {
                // 連線漸層
                const gradient = state.ctx.createLinearGradient(
                    testPoint.x, testPoint.y,
                    neighbor.point.x, neighbor.point.y
                );
                gradient.addColorStop(0, COLORS.neighborLine);
                gradient.addColorStop(1, 'rgba(251, 191, 36, 0.1)');

                state.ctx.beginPath();
                state.ctx.moveTo(testPoint.x, testPoint.y);
                state.ctx.lineTo(neighbor.point.x, neighbor.point.y);
                state.ctx.strokeStyle = gradient;
                state.ctx.lineWidth = 2;
                state.ctx.setLineDash([5, 5]);
                state.ctx.stroke();
                state.ctx.setLineDash([]);

                // 顯示距離標籤
                const midX = (testPoint.x + neighbor.point.x) / 2;
                const midY = (testPoint.y + neighbor.point.y) / 2;

                state.ctx.font = '10px Noto Sans TC';
                state.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                state.ctx.textAlign = 'center';
                state.ctx.fillText(neighbor.distance.toFixed(0), midX, midY - 5);
            });
        }

        // 繪製測試點
        // 外圈發光
        state.ctx.beginPath();
        state.ctx.arc(testPoint.x, testPoint.y, CONFIG.TEST_POINT_RADIUS + 8, 0, Math.PI * 2);
        state.ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
        state.ctx.fill();

        // 主要圓點
        state.ctx.beginPath();
        state.ctx.arc(testPoint.x, testPoint.y, CONFIG.TEST_POINT_RADIUS, 0, Math.PI * 2);
        state.ctx.fillStyle = COLORS.testPoint;
        state.ctx.fill();

        // 白色邊框
        state.ctx.strokeStyle = 'white';
        state.ctx.lineWidth = 3;
        state.ctx.stroke();

        // 中心問號或分類結果
        state.ctx.font = 'bold 12px Noto Sans TC';
        state.ctx.fillStyle = '#1a1a2e';
        state.ctx.textAlign = 'center';
        state.ctx.textBaseline = 'middle';

        if (classification) {
            state.ctx.fillText(classification.predictedClass, testPoint.x, testPoint.y);
        } else {
            state.ctx.fillText('?', testPoint.x, testPoint.y);
        }
    });
}

// ===========================
// UI 更新
// ===========================

/**
 * 更新結果面板
 */
function updateResultPanel(testPoint) {
    const resultPanel = document.getElementById('resultPanel');
    const classification = testPoint.classification;

    if (!classification) {
        resetResultPanel();
        return;
    }

    const classColor = classification.predictedClass === 'A' ? 'class-a' : 'class-b';
    const className = classification.predictedClass === 'A' ? '類別 A' : '類別 B';

    // 計算平均距離
    const avgDistance = classification.kNearest.reduce((sum, n) => sum + n.distance, 0) / state.k;

    resultPanel.innerHTML = `
        <div class="result-content">
            <div class="result-header">
                <span class="result-label">分類結果：</span>
                <span class="result-class ${classColor}">${className}</span>
            </div>
            <div class="result-details">
                <div class="detail-item">
                    <div class="detail-label">類別 A 票數</div>
                    <div class="detail-value class-a">${classification.votes.A}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">類別 B 票數</div>
                    <div class="detail-value class-b">${classification.votes.B}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">K 值</div>
                    <div class="detail-value">${state.k}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">平均距離</div>
                    <div class="detail-value">${avgDistance.toFixed(1)}</div>
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
        <div class="result-placeholder">
            <span class="icon">🔍</span>
            <p>點擊畫布新增測試點以查看分類結果</p>
        </div>
    `;
}

// ===========================
// 視窗大小調整
// ===========================
window.addEventListener('resize', () => {
    // 延遲執行避免頻繁觸發
    clearTimeout(window.resizeTimeout);
    window.resizeTimeout = setTimeout(() => {
        initCanvas();
        render();
    }, 250);
});
