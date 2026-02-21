/**
 * Feature Scaling 特徵縮放互動教學 - JavaScript 邏輯
 * 實作三種常見的特徵縮放方法：Min-Max、Z-Score、MaxAbs
 * 
 * 本程式的核心功能：
 * 1. 載入預設或自訂資料集
 * 2. 計算三種縮放方法的結果
 * 3. 使用 Canvas 繪製長條圖視覺化
 * 4. 顯示統計資訊
 */

// ===========================
// 全域設定與常數
// ===========================

// 三種縮放方法的顏色配置
const METHOD_COLORS = {
    original: '#94a3b8',  // 原始資料 - 灰色
    minmax: '#f472b6',    // Min-Max - 粉紅色
    zscore: '#60a5fa',    // Z-Score - 藍色
    maxabs: '#fbbf24'     // MaxAbs - 黃色
};

// 三個特徵的顏色配置
const FEATURE_COLORS = ['#f472b6', '#60a5fa', '#fbbf24'];

// 預定義資料集
// 每個資料集包含三個不同量綱的特徵，讓學生觀察縮放前後的差異
const DATASETS = {
    housing: {
        name: '房屋資料',
        features: ['坪數', '屋齡(年)', '房間數'],
        data: [
            [25, 10, 3],
            [40, 5, 4],
            [15, 30, 2],
            [55, 2, 5],
            [30, 15, 3],
            [20, 25, 2]
        ]
    },
    student: {
        name: '學生成績',
        features: ['數學', '英語', '體育'],
        data: [
            [85, 72, 90],
            [92, 88, 75],
            [60, 95, 85],
            [78, 65, 95],
            [95, 80, 70],
            [70, 90, 88]
        ]
    },
    health: {
        name: '健康指標',
        features: ['身高(cm)', '體重(kg)', '血壓(mmHg)'],
        data: [
            [170, 65, 120],
            [160, 55, 110],
            [180, 80, 130],
            [155, 50, 105],
            [175, 72, 125],
            [165, 60, 115]
        ]
    }
};

// ===========================
// 應用程式狀態管理
// ===========================
let state = {
    currentDataset: null,       // 當前使用的資料集
    currentChart: 'original',   // 當前顯示的圖表類型
    currentResult: 'original',  // 當前顯示的結果類型（預設顯示原始資料）
    scaledResults: null,        // 縮放計算結果
    canvas: null,               // Canvas 元素
    ctx: null,                  // Canvas 繪圖上下文
    canvasInitialized: false    // Canvas 是否已初始化
};

// ===========================
// 初始化
// ===========================

/**
 * 頁面載入完成後初始化應用程式
 */
document.addEventListener('DOMContentLoaded', () => {
    initControls();
});

/**
 * 初始化 Canvas 繪圖環境
 * 處理高解析度螢幕的像素比例，確保圖表清晰
 */
function initCanvas() {
    state.canvas = document.getElementById('scalingCanvas');
    state.ctx = state.canvas.getContext('2d');

    // 處理 HiDPI 高解析度螢幕
    const dpr = window.devicePixelRatio || 1;
    const rect = state.canvas.getBoundingClientRect();

    // 若元素尺寸為 0（尚未顯示），使用 HTML 屬性的預設尺寸
    const w = rect.width || state.canvas.width;
    const h = rect.height || state.canvas.height;

    // 設定 Canvas 內部像素尺寸（實際渲染大小）
    state.canvas.width = w * dpr;
    state.canvas.height = h * dpr;

    // 設定 CSS 顯示尺寸（視覺大小）
    state.canvas.style.width = w + 'px';
    state.canvas.style.height = h + 'px';

    // 縮放繪圖上下文以匹配高解析度
    state.ctx.scale(dpr, dpr);

    state.canvasInitialized = true;
}

/**
 * 初始化所有控制元件的事件監聽器
 */
function initControls() {
    // 資料集選擇下拉選單
    document.getElementById('datasetSelect').addEventListener('change', onDatasetChange);

    // 執行縮放按鈕
    document.getElementById('scaleBtn').addEventListener('click', executeScaling);

    // 清除按鈕
    document.getElementById('clearBtn').addEventListener('click', clearAll);

    // 圖表標籤頁切換
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            // 切換 active 狀態
            document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            // 更新當前圖表類型並重新繪製
            state.currentChart = tab.dataset.chart;
            if (state.scaledResults) {
                drawChart();
            }
        });
    });

    // 結果標籤頁切換
    document.querySelectorAll('.result-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.result-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.currentResult = tab.dataset.result;
            if (state.scaledResults) {
                renderResultTable();
            }
        });
    });
}

// ===========================
// 資料集切換功能
// ===========================

/**
 * 當使用者切換資料集時觸發
 * 若選擇「自訂」則顯示自訂輸入區域
 */
function onDatasetChange(e) {
    const value = e.target.value;
    const customArea = document.getElementById('customInputArea');

    if (value === 'custom') {
        // 顯示自訂輸入區域
        customArea.style.display = 'flex';
    } else {
        // 隱藏自訂輸入區域
        customArea.style.display = 'none';
    }
}

/**
 * 取得當前的資料集（預設或自訂）
 * @returns {Object|null} 資料集物件，包含 name, features, data
 */
function getCurrentDataset() {
    const datasetKey = document.getElementById('datasetSelect').value;

    if (datasetKey === 'custom') {
        return getCustomDataset();
    }

    return DATASETS[datasetKey];
}

/**
 * 取得使用者自訂的資料集
 * @returns {Object|null} 自訂資料集物件
 */
function getCustomDataset() {
    try {
        const features = [];
        const columns = [];

        // 讀取三個特徵的名稱和數值
        for (let i = 1; i <= 3; i++) {
            const name = document.getElementById(`feature${i}Name`).value.trim() || `特徵${i}`;
            const valuesStr = document.getElementById(`feature${i}Values`).value.trim();

            // 如果沒有輸入數值則跳過此特徵
            if (!valuesStr) continue;

            // 將逗號分隔的字串轉換為數值陣列
            const values = valuesStr.split(',').map(v => {
                const num = parseFloat(v.trim());
                if (isNaN(num)) throw new Error(`「${name}」包含無效數值`);
                return num;
            });

            features.push(name);
            columns.push(values);
        }

        // 檢查是否有足夠的特徵
        if (features.length < 2) {
            alert('請至少輸入兩個特徵的數值！');
            return null;
        }

        // 檢查所有特徵的資料筆數是否一致
        const dataLength = columns[0].length;
        if (!columns.every(col => col.length === dataLength)) {
            alert('每個特徵的數值數量必須相同！');
            return null;
        }

        // 將「每行一個特徵」的格式轉為「每行一筆資料」的格式
        const data = [];
        for (let row = 0; row < dataLength; row++) {
            data.push(columns.map(col => col[row]));
        }

        return { name: '自訂資料', features, data };
    } catch (error) {
        alert('資料格式錯誤：' + error.message);
        return null;
    }
}

// ===========================
// 特徵縮放計算核心
// ===========================

/**
 * 執行特徵縮放 - 主功能函數
 * 載入資料、計算縮放結果、更新畫面
 */
function executeScaling() {
    const dataset = getCurrentDataset();
    if (!dataset) return;

    state.currentDataset = dataset;

    // 提取每個特徵的資料欄位
    const featureColumns = [];
    for (let j = 0; j < dataset.features.length; j++) {
        featureColumns.push(dataset.data.map(row => row[j]));
    }

    // 計算三種縮放方法的結果
    state.scaledResults = {
        original: featureColumns,
        minmax: featureColumns.map(col => minMaxScale(col)),
        zscore: featureColumns.map(col => zScoreScale(col)),
        maxabs: featureColumns.map(col => maxAbsScale(col)),
        stats: featureColumns.map(col => calculateStats(col))
    };

    // 延遲初始化 Canvas（確保元素已可見）
    if (!state.canvasInitialized) {
        initCanvas();
    }

    // 更新所有顯示區域
    renderResultTable();
    renderStats();
    drawChart();
}

/**
 * Min-Max Scaling（最小最大標準化）
 * 公式：X' = (X - Xmin) / (Xmax - Xmin)
 * 將數據線性縮放到 [0, 1] 範圍
 * 
 * @param {number[]} data - 原始數據陣列
 * @returns {number[]} 縮放後的數據陣列
 */
function minMaxScale(data) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;

    // 若最大值等於最小值（所有值相同），則返回 0
    if (range === 0) return data.map(() => 0);

    return data.map(x => (x - min) / range);
}

/**
 * Z-Score Standardization（Z 分數標準化）
 * 公式：X' = (X - μ) / σ
 * 將數據轉換為均值 0、標準差 1 的分佈
 * 
 * @param {number[]} data - 原始數據陣列
 * @returns {number[]} 標準化後的數據陣列
 */
function zScoreScale(data) {
    const mean = data.reduce((sum, x) => sum + x, 0) / data.length;

    // 計算標準差（使用母體標準差）
    const variance = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / data.length;
    const std = Math.sqrt(variance);

    // 若標準差為 0（所有值相同），則返回 0
    if (std === 0) return data.map(() => 0);

    return data.map(x => (x - mean) / std);
}

/**
 * MaxAbs Scaling（最大絕對值縮放）
 * 公式：X' = X / |Xmax|
 * 將數據縮放到 [-1, 1] 範圍，保留零值特性
 * 
 * @param {number[]} data - 原始數據陣列
 * @returns {number[]} 縮放後的數據陣列
 */
function maxAbsScale(data) {
    const maxAbs = Math.max(...data.map(x => Math.abs(x)));

    // 若最大絕對值為 0，則返回 0
    if (maxAbs === 0) return data.map(() => 0);

    return data.map(x => x / maxAbs);
}

/**
 * 計算統計資訊
 * @param {number[]} data - 數據陣列
 * @returns {Object} 包含最小值、最大值、平均值、標準差的統計資訊
 */
function calculateStats(data) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const mean = data.reduce((sum, x) => sum + x, 0) / data.length;
    const variance = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / data.length;
    const std = Math.sqrt(variance);

    return { min, max, mean, std };
}

// ===========================
// 畫面渲染功能
// ===========================

/**
 * 渲染縮放結果表格
 * 根據當前選擇的標籤頁顯示對應的縮放方法結果（含原始資料）
 */
function renderResultTable() {
    const dataset = state.currentDataset;
    const results = state.scaledResults;
    const container = document.getElementById('resultTable');
    const methodKey = state.currentResult;

    // 取得對應方法的資料
    const scaledData = results[methodKey];
    if (!scaledData) return;

    // 判斷是否為原始資料
    const isOriginal = methodKey === 'original';

    let html = `<table class="data-table"><thead><tr><th>樣本</th>`;

    dataset.features.forEach((f, i) => {
        html += `<th class="feature-${i + 1}">${escapeHtml(f)}</th>`;
    });
    html += '</tr></thead><tbody>';

    // 顯示值（原始資料不需小數位，縮放後保留 4 位小數）
    const numRows = scaledData[0].length;
    for (let row = 0; row < numRows; row++) {
        html += `<tr><td>#${row + 1}</td>`;
        scaledData.forEach(col => {
            const val = isOriginal ? col[row] : col[row].toFixed(4);
            html += `<td>${val}</td>`;
        });
        html += '</tr>';
    }

    html += '</tbody></table>';
    container.innerHTML = html;
}

/**
 * 渲染統計資訊面板
 */
function renderStats() {
    const dataset = state.currentDataset;
    const stats = state.scaledResults.stats;
    const container = document.getElementById('statsDisplay');

    let html = '';

    stats.forEach((s, i) => {
        html += `
            <div class="stat-group feature-${i + 1}-border">
                <h4 class="feature-${i + 1}-color">${escapeHtml(dataset.features[i])}</h4>
                <div class="stat-row">
                    <span class="stat-label">最小值</span>
                    <span class="stat-value">${s.min.toFixed(2)}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">最大值</span>
                    <span class="stat-value">${s.max.toFixed(2)}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">平均值 (μ)</span>
                    <span class="stat-value">${s.mean.toFixed(2)}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">標準差 (σ)</span>
                    <span class="stat-value">${s.std.toFixed(2)}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ===========================
// Canvas 圖表繪製
// ===========================

/**
 * 繪製長條圖 - 主繪圖函數
 * 根據當前選擇的圖表類型繪製對應的長條圖
 */
function drawChart() {
    const ctx = state.ctx;
    const width = state.canvas.getBoundingClientRect().width;
    const height = state.canvas.getBoundingClientRect().height;

    // 清除畫布
    ctx.clearRect(0, 0, width, height);

    // 繪製背景網格
    drawGrid(width, height);

    const results = state.scaledResults;
    const dataset = state.currentDataset;
    const chartType = state.currentChart;

    // 取得要顯示的資料
    const data = results[chartType];
    if (!data) return;

    // 圖表參數設定
    const padding = { top: 40, right: 30, bottom: 50, left: 60 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    // 找出全域最大最小值用於 Y 軸範圍
    let allValues = data.flat();
    let yMin = Math.min(0, Math.min(...allValues));
    let yMax = Math.max(...allValues);

    // 加上 10% 的邊距
    const yRange = yMax - yMin || 1;
    yMin -= yRange * 0.1;
    yMax += yRange * 0.1;

    // 繪製座標軸
    drawAxes(ctx, padding, width, height, yMin, yMax, dataset.data.length);

    // 繪製長條圖
    const numSamples = dataset.data.length;
    const numFeatures = data.length;
    const groupWidth = plotWidth / numSamples;
    const barWidth = (groupWidth * 0.7) / numFeatures;
    const groupPadding = groupWidth * 0.15;

    // 逐一繪製每個樣本的每個特徵長條
    for (let sample = 0; sample < numSamples; sample++) {
        for (let feature = 0; feature < numFeatures; feature++) {
            const value = data[feature][sample];

            // 計算長條的 X 座標
            const x = padding.left + sample * groupWidth + groupPadding + feature * barWidth;

            // 計算長條的 Y 座標和高度（支援負值）
            const zeroY = padding.top + plotHeight * (yMax / (yMax - yMin));
            const valueY = padding.top + plotHeight * ((yMax - value) / (yMax - yMin));
            const barHeight = Math.abs(valueY - zeroY);
            const barY = Math.min(valueY, zeroY);

            // 繪製長條（帶圓角和漸層效果）
            const gradient = ctx.createLinearGradient(x, barY, x, barY + barHeight);
            gradient.addColorStop(0, FEATURE_COLORS[feature]);
            gradient.addColorStop(1, FEATURE_COLORS[feature] + '80');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            // 使用簡單的矩形（避免小長條的圓角問題）
            if (barHeight > 4) {
                ctx.roundRect(x, barY, barWidth - 2, barHeight, [3, 3, 0, 0]);
            } else {
                ctx.rect(x, barY, barWidth - 2, Math.max(barHeight, 1));
            }
            ctx.fill();

            // 在長條上方顯示數值
            ctx.fillStyle = FEATURE_COLORS[feature];
            ctx.font = '10px "Courier New"';
            ctx.textAlign = 'center';
            const displayValue = chartType === 'original'
                ? value.toString()
                : value.toFixed(2);
            ctx.fillText(displayValue, x + barWidth / 2 - 1, valueY - 5);
        }
    }

    // 繪製圖表標題
    const titles = {
        original: '原始資料',
        minmax: 'Min-Max Scaling 結果',
        zscore: 'Z-Score 標準化結果',
        maxabs: 'MaxAbs Scaling 結果'
    };
    ctx.fillStyle = METHOD_COLORS[chartType] || '#94a3b8';
    ctx.font = 'bold 14px "Noto Sans TC"';
    ctx.textAlign = 'center';
    ctx.fillText(titles[chartType], width / 2, 25);

    // 更新圖例
    updateLegend(dataset.features);
}

/**
 * 繪製背景網格
 */
function drawGrid(width, height) {
    const ctx = state.ctx;
    const gridSize = 40;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;

    // 垂直線
    for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }

    // 水平線
    for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
}

/**
 * 繪製座標軸與刻度
 */
function drawAxes(ctx, padding, width, height, yMin, yMax, numSamples) {
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    // 座標軸線條
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;

    // X 軸
    const xAxisY = padding.top + plotHeight * (yMax / (yMax - yMin));
    ctx.beginPath();
    ctx.moveTo(padding.left, Math.min(xAxisY, padding.top + plotHeight));
    ctx.lineTo(width - padding.right, Math.min(xAxisY, padding.top + plotHeight));
    ctx.stroke();

    // Y 軸
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + plotHeight);
    ctx.stroke();

    // Y 軸刻度
    ctx.fillStyle = '#64748b';
    ctx.font = '11px "Courier New"';
    ctx.textAlign = 'right';

    const numTicks = 5;
    for (let i = 0; i <= numTicks; i++) {
        const value = yMin + (yMax - yMin) * (1 - i / numTicks);
        const y = padding.top + (i / numTicks) * plotHeight;

        // 刻度線
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        // 刻度值
        ctx.fillStyle = '#64748b';
        ctx.fillText(value.toFixed(1), padding.left - 8, y + 4);
    }

    // X 軸樣本標籤
    ctx.textAlign = 'center';
    const groupWidth = plotWidth / numSamples;
    for (let i = 0; i < numSamples; i++) {
        const x = padding.left + i * groupWidth + groupWidth / 2;
        ctx.fillText(`#${i + 1}`, x, padding.top + plotHeight + 20);
    }

    // 軸標籤
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px "Noto Sans TC"';
    ctx.textAlign = 'center';
    ctx.fillText('樣本', width / 2, height - 5);

    // Y 軸標籤
    ctx.save();
    ctx.translate(12, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('數值', 0, 0);
    ctx.restore();
}

/**
 * 更新圖例區域
 */
function updateLegend(features) {
    const container = document.getElementById('chartLegend');
    container.innerHTML = features.map((f, i) =>
        `<span class="legend-item">
            <span class="legend-dot" style="background: ${FEATURE_COLORS[i]};"></span>
            ${escapeHtml(f)}
        </span>`
    ).join('');
}

// ===========================
// 工具函數
// ===========================

/**
 * 清除所有選擇與畫面狀態
 */
function clearAll() {
    state.currentDataset = null;
    state.scaledResults = null;
    state.currentChart = 'original';
    state.currentResult = 'original';

    // 重置資料集選擇
    document.getElementById('datasetSelect').value = 'housing';
    document.getElementById('customInputArea').style.display = 'none';

    // 重置結果表格
    document.getElementById('resultTable').innerHTML =
        '<div class="placeholder-text">選擇資料集後點擊「執行特徵縮放」</div>';

    // 重置統計資訊
    document.getElementById('statsDisplay').innerHTML =
        '<div class="placeholder-text">執行縮放後顯示統計數據</div>';

    // 重置標籤頁
    document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.chart-tab[data-chart="original"]').classList.add('active');
    document.querySelectorAll('.result-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.result-tab[data-result="original"]').classList.add('active');

    // 清除 Canvas
    if (state.ctx && state.canvasInitialized) {
        const width = state.canvas.getBoundingClientRect().width;
        const height = state.canvas.getBoundingClientRect().height;
        state.ctx.clearRect(0, 0, width, height);
    }

    // 清除圖例
    document.getElementById('chartLegend').innerHTML = '';
}

/**
 * HTML 跳脫處理（防止 XSS 攻擊）
 * @param {string} text - 需要處理的文字
 * @returns {string} 處理後的安全文字
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
