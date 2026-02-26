/**
 * Categorical Encoding 類別編碼互動教學 - JavaScript 邏輯
 * 
 * 設計理念：步驟式教學
 * 1. 使用者選擇資料集 → 顯示原始資料
 * 2. 點擊「開始編碼」→ 三種方法的結果同時展開
 * 3. 每種方法獨立區塊，方便比較
 */

// ===========================
// 預定義資料集
// ===========================

// 每個資料集包含類別型特徵
// ordinalOrder：定義有序類別的排序（用於 Ordinal Encoding）
const DATASETS = {
    fruit: {
        name: '水果資料',
        features: ['顏色', '大小', '種類'],
        ordinalOrder: { '大小': ['小', '中', '大'] },
        data: [
            ['紅', '大', '蘋果'],
            ['黃', '中', '香蕉'],
            ['紫', '小', '葡萄'],
            ['紅', '中', '蘋果'],
            ['綠', '大', '西瓜'],
            ['黃', '小', '檸檬']
        ]
    },
    student: {
        name: '學生資料',
        features: ['性別', '學歷', '血型'],
        ordinalOrder: { '學歷': ['國中', '高中', '大學', '碩士'] },
        data: [
            ['男', '高中', 'A'],
            ['女', '大學', 'B'],
            ['男', '碩士', 'O'],
            ['女', '高中', 'AB'],
            ['男', '大學', 'A'],
            ['女', '國中', 'B']
        ]
    },
    weather: {
        name: '天氣資料',
        features: ['天氣', '風向', '季節'],
        ordinalOrder: { '季節': ['春', '夏', '秋', '冬'] },
        data: [
            ['晴', '東', '春'],
            ['雨', '南', '夏'],
            ['陰', '西', '秋'],
            ['晴', '北', '冬'],
            ['雨', '東', '夏'],
            ['陰', '南', '春']
        ]
    }
};

// 特徵代表顏色（與 CSS 一致）
const FEATURE_COLORS = {
    label: '#f472b6',
    onehot: '#60a5fa',
    ordinal: '#a78bfa',
    freq: '#34d399'  // emerald 綠色
};

// ===========================
// 初始化
// ===========================

document.addEventListener('DOMContentLoaded', () => {
    // 資料集選擇器切換
    document.getElementById('datasetSelect').addEventListener('change', (e) => {
        const customArea = document.getElementById('customInputArea');
        customArea.style.display = (e.target.value === 'custom') ? 'flex' : 'none';
    });

    // 執行編碼按鈕
    document.getElementById('encodeBtn').addEventListener('click', executeEncoding);

    // 清除按鈕
    document.getElementById('clearBtn').addEventListener('click', clearAll);
});

// ===========================
// 主功能：執行編碼
// ===========================

/**
 * 執行類別編碼 — 載入資料、計算結果、渲染畫面
 */
function executeEncoding() {
    const dataset = getCurrentDataset();
    if (!dataset) return;

    // ① 渲染原始資料表格
    renderOriginalTable(dataset);

    // ② 計算三種編碼結果
    const featureCols = [];
    for (let j = 0; j < dataset.features.length; j++) {
        featureCols.push(dataset.data.map(row => row[j]));
    }

    // ③ 渲染四種方法的結果表格
    renderLabelResult(dataset, featureCols);
    renderOneHotResult(dataset, featureCols);
    renderOrdinalResult(dataset, featureCols);
    renderFrequencyResult(dataset, featureCols);

    // ④ 顯示結果區塊（帶平滑捲動）
    const resultSection = document.getElementById('resultsSection');
    resultSection.style.display = '';
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===========================
// 資料讀取
// ===========================

/**
 * 取得當前選擇的資料集
 * @returns {Object|null} 資料集物件
 */
function getCurrentDataset() {
    const key = document.getElementById('datasetSelect').value;

    if (key === 'custom') {
        return getCustomDataset();
    }
    return DATASETS[key];
}

/**
 * 取得使用者自訂的資料集
 */
function getCustomDataset() {
    try {
        const features = [];
        const columns = [];

        for (let i = 1; i <= 2; i++) {
            const name = document.getElementById(`feature${i}Name`).value.trim() || `特徵${i}`;
            const valStr = document.getElementById(`feature${i}Values`).value.trim();
            if (!valStr) continue;

            const values = valStr.split(',').map(v => v.trim()).filter(v => v);
            if (values.length === 0) continue;

            features.push(name);
            columns.push(values);
        }

        if (features.length < 1) {
            alert('請至少輸入一個特徵的類別值！');
            return null;
        }

        const len = columns[0].length;
        if (!columns.every(c => c.length === len)) {
            alert('每個特徵的類別數量必須相同！');
            return null;
        }

        // 轉為每行一筆資料的格式
        const data = [];
        for (let r = 0; r < len; r++) {
            data.push(columns.map(c => c[r]));
        }

        return { name: '自訂資料', features, ordinalOrder: {}, data };
    } catch (err) {
        alert('資料格式錯誤：' + err.message);
        return null;
    }
}

// ===========================
// 三種編碼演算法
// ===========================

/**
 * Label Encoding（標籤編碼）
 * 將每個不重複的類別依出現順序對應到一個整數（0, 1, 2, ...）
 *
 * 範例：['紅', '藍', '綠', '紅'] → [0, 1, 2, 0]
 * ⚠️ 會引入假的大小關係，不適合無序類別搭配線性模型
 *
 * @param {string[]} col - 某個特徵的所有類別值
 * @returns {{ encoded: number[], mapping: Object }}
 */
function labelEncode(col) {
    const unique = [...new Set(col)];
    const mapping = {};
    unique.forEach((v, i) => { mapping[v] = i; });
    return {
        encoded: col.map(v => mapping[v]),
        mapping
    };
}

/**
 * One-Hot Encoding（獨熱編碼）
 * 為每個類別建立一個專屬的二元欄位，是就填 1，不是就填 0
 *
 * 範例：['紅','藍','綠'] → 紅=[1,0,0], 藍=[0,1,0], 綠=[0,0,1]
 * ✅ 不引入大小關係  ⚠️ 類別太多會維度爆炸
 *
 * @param {string[]} col - 某個特徵的所有類別值
 * @param {string} featureName - 特徵名稱（用於命名展開欄位）
 * @returns {{ encoded: number[][], columns: string[] }}
 */
function oneHotEncode(col, featureName) {
    const unique = [...new Set(col)];
    const columns = unique.map(v => `${featureName}_${v}`);
    const encoded = col.map(v => unique.map(u => (v === u) ? 1 : 0));
    return { encoded, columns };
}

/**
 * Ordinal Encoding（順序編碼）
 * 依照類別的邏輯順序指定數值（例如：小=0, 中=1, 大=2）
 * 若沒有預定義順序，退回為出現順序
 *
 * @param {string[]} col - 某個特徵的所有類別值
 * @param {string} featureName - 特徵名稱
 * @param {Object} ordinalOrder - 預定義的排序表
 * @returns {{ encoded: number[], mapping: Object, hasOrder: boolean }}
 */
function ordinalEncode(col, featureName, ordinalOrder) {
    const hasOrder = !!ordinalOrder[featureName];
    const order = hasOrder ? ordinalOrder[featureName] : [...new Set(col)];

    const mapping = {};
    order.forEach((v, i) => { mapping[v] = i; });

    return {
        encoded: col.map(v => (mapping[v] !== undefined) ? mapping[v] : -1),
        mapping,
        hasOrder
    };
}

/**
 * Frequency Encoding（頻率編碼）
 * 把每個類別替換成「該類別在資料中出現的比例（次數 / 總筆數）」
 *
 * 範例：資料共 6 筆， Apple 出現 2 次 → 2/6 ≈ 0.3333
 * ✅ 不需要目標値  ✅ 可處理高基數類別  ⚠️ 頻率相同的類別編碼後無法區分
 *
 * @param {string[]} col - 某個特徵的所有類別値
 * @returns {{ encoded: number[], countMap: Object, ratioMap: Object }}
 */
function frequencyEncode(col) {
    const n = col.length; // 總資料筆數

    // 第一步：統計每個類別出現的次數
    const countMap = {};
    col.forEach(v => {
        countMap[v] = (countMap[v] || 0) + 1;
    });

    // 第二步：將次數轉為比例（保留四位小數）
    const ratioMap = {};
    for (const [cat, cnt] of Object.entries(countMap)) {
        ratioMap[cat] = parseFloat((cnt / n).toFixed(4));
    }

    // 第三步：把每筆資料的類別替換為對應的比例値
    return {
        encoded: col.map(v => ratioMap[v]),
        countMap, // 次數對照表
        ratioMap  // 比例對照表
    };
}

// ===========================
// 渲染函數
// ===========================

/**
 * 渲染原始資料表格
 */
function renderOriginalTable(dataset) {
    const container = document.getElementById('originalTable');
    let html = '<table class="data-table"><thead><tr><th>樣本</th>';

    dataset.features.forEach((f, i) => {
        html += `<th class="feature-${i + 1}">${esc(f)}</th>`;
    });
    html += '</tr></thead><tbody>';

    dataset.data.forEach((row, i) => {
        html += `<tr><td>#${i + 1}</td>`;
        row.forEach(v => { html += `<td>${esc(v)}</td>`; });
        html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

/**
 * 渲染 Label Encoding 結果
 */
function renderLabelResult(dataset, featureCols) {
    const container = document.getElementById('labelTable');
    const results = featureCols.map(col => labelEncode(col));

    let html = '<table class="data-table"><thead><tr><th>樣本</th>';
    dataset.features.forEach((f, i) => {
        html += `<th class="feature-${i + 1}">${esc(f)}</th>`;
    });
    html += '</tr></thead><tbody>';

    for (let r = 0; r < dataset.data.length; r++) {
        html += `<tr><td>#${r + 1}</td>`;
        results.forEach((res, fi) => {
            // 顯示：原始值 → 編碼值
            const original = dataset.data[r][fi];
            const encoded = res.encoded[r];
            html += `<td><span style="color:var(--text-muted)">${esc(original)}</span> → <strong style="color:var(--color-label)">${encoded}</strong></td>`;
        });
        html += '</tr>';
    }

    // 加入對照表摘要
    html += '</tbody></table>';
    html += '<div style="margin-top:0.75rem; display:flex; gap:1rem; flex-wrap:wrap;">';
    results.forEach((res, fi) => {
        const entries = Object.entries(res.mapping).map(([k, v]) => `${esc(k)}=${v}`).join(', ');
        html += `<span style="font-size:0.8rem; color:var(--text-muted);">📋 ${esc(dataset.features[fi])}：${entries}</span>`;
    });
    html += '</div>';

    container.innerHTML = html;
}

/**
 * 渲染 One-Hot Encoding 結果
 */
function renderOneHotResult(dataset, featureCols) {
    const container = document.getElementById('onehotTable');
    const results = featureCols.map((col, i) => oneHotEncode(col, dataset.features[i]));

    // 收集所有展開的欄位名稱
    let allColumns = [];
    results.forEach(res => { allColumns = allColumns.concat(res.columns); });

    let html = '<table class="data-table"><thead><tr><th>樣本</th>';
    allColumns.forEach(col => {
        html += `<th style="font-size:0.78rem">${esc(col)}</th>`;
    });
    html += '</tr></thead><tbody>';

    for (let r = 0; r < dataset.data.length; r++) {
        html += `<tr><td>#${r + 1}</td>`;
        results.forEach(res => {
            res.encoded[r].forEach(val => {
                if (val === 1) {
                    html += `<td class="hot">${val}</td>`;
                } else {
                    html += `<td style="color:var(--text-muted)">${val}</td>`;
                }
            });
        });
        html += '</tr>';
    }

    html += '</tbody></table>';
    // 說明維度變化
    const origDim = dataset.features.length;
    const newDim = allColumns.length;
    html += `<div style="margin-top:0.75rem; font-size:0.82rem; color:var(--text-muted);">
        📐 維度變化：${origDim} 個欄位 → <strong style="color:var(--color-onehot)">${newDim} 個欄位</strong>
    </div>`;

    container.innerHTML = html;
}

/**
 * 渲染 Ordinal Encoding 結果
 */
function renderOrdinalResult(dataset, featureCols) {
    const container = document.getElementById('ordinalTable');
    const results = featureCols.map((col, i) =>
        ordinalEncode(col, dataset.features[i], dataset.ordinalOrder || {})
    );

    let html = '<table class="data-table"><thead><tr><th>樣本</th>';
    dataset.features.forEach((f, i) => {
        // 標示哪些特徵有預定義順序
        const badge = results[i].hasOrder
            ? ' <span style="font-size:0.7rem; color:var(--color-ordinal);">✓有序</span>'
            : ' <span style="font-size:0.7rem; color:var(--text-muted);">無序</span>';
        html += `<th class="feature-${i + 1}">${esc(f)}${badge}</th>`;
    });
    html += '</tr></thead><tbody>';

    for (let r = 0; r < dataset.data.length; r++) {
        html += `<tr><td>#${r + 1}</td>`;
        results.forEach((res, fi) => {
            const original = dataset.data[r][fi];
            const encoded = res.encoded[r];
            const color = res.hasOrder ? 'var(--color-ordinal)' : 'var(--text-secondary)';
            html += `<td><span style="color:var(--text-muted)">${esc(original)}</span> → <strong style="color:${color}">${encoded}</strong></td>`;
        });
        html += '</tr>';
    }

    html += '</tbody></table>';

    // 顯示排序依據
    html += '<div style="margin-top:0.75rem; display:flex; gap:1rem; flex-wrap:wrap;">';
    results.forEach((res, fi) => {
        const entries = Object.entries(res.mapping)
            .sort((a, b) => a[1] - b[1])
            .map(([k, v]) => `${esc(k)}=${v}`)
            .join(', ');
        const icon = res.hasOrder ? '📏' : '🏷️';
        html += `<span style="font-size:0.8rem; color:var(--text-muted);">${icon} ${esc(dataset.features[fi])}：${entries}</span>`;
    });
    html += '</div>';

    container.innerHTML = html;
}

/**
 * 渲染 Frequency Encoding 結果
 * 自動計算每個特徵中各類別的頻率比例，顯示結果表格
 */
function renderFrequencyResult(dataset, featureCols) {
    const container = document.getElementById('freqTable');

    // --- 對每個特徵進行 Frequency Encoding ---
    const results = featureCols.map(col => frequencyEncode(col));

    // --- 建立結果表格 ---
    let html = '<table class="data-table"><thead><tr><th>樣本</th>';
    dataset.features.forEach((f, i) => {
        html += `<th class="feature-${i + 1}">${esc(f)}</th>`;
    });
    html += '</tr></thead><tbody>';

    for (let r = 0; r < dataset.data.length; r++) {
        html += `<tr><td>#${r + 1}</td>`;
        results.forEach((res, fi) => {
            const original = dataset.data[r][fi];    // 原始類別字串
            const encoded = res.encoded[r];           // 頻率比例値
            const count = res.countMap[original];     // 出現次數
            html += `<td>`;
            html += `<span style="color:var(--text-muted)">${esc(original)}</span> → `;
            html += `<strong style="color:var(--color-freq)">${encoded}</strong>`;
            html += `<span style="font-size:0.78rem;color:var(--text-muted)"> (次數:${count})</span>`;
            html += `</td>`;
        });
        html += '</tr>';
    }

    html += '</tbody></table>';

    // --- 加入各特徵的類別頻率對照表 ---
    html += '<div style="margin-top:0.75rem; display:flex; gap:1rem; flex-wrap:wrap;">';
    results.forEach((res, fi) => {
        // 依比例由大到小排序
        const entries = Object.entries(res.ratioMap)
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => `${esc(k)}=${v}(${res.countMap[k]}次)`)
            .join(', ');
        html += `<span style="font-size:0.8rem; color:var(--text-muted)">📊 ${esc(dataset.features[fi])}頻率：${entries}</span>`;
    });
    html += '</div>';

    container.innerHTML = html;
}

// ===========================
// 工具函數
// ===========================

/**
 * 清除所有狀態
 */
function clearAll() {
    document.getElementById('datasetSelect').value = 'fruit';
    document.getElementById('customInputArea').style.display = 'none';
    document.getElementById('originalTable').innerHTML =
        '<div class="placeholder-text">👆 選擇資料集後點擊「開始編碼」</div>';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('labelTable').innerHTML = '';
    document.getElementById('onehotTable').innerHTML = '';
    document.getElementById('ordinalTable').innerHTML = '';
    document.getElementById('freqTable').innerHTML = '';
}

/**
 * HTML 跳脫（防止 XSS）
 * @param {string} text
 * @returns {string}
 */
function esc(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
