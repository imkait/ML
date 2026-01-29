/**
 * Embedding 詞嵌入互動教學 - JavaScript 邏輯
 * 實作詞嵌入概念的視覺化與互動功能
 * 
 * 本程式模擬 Embedding 的核心概念：
 * 1. 將詞彙轉換成數值向量
 * 2. 在 2D 空間中視覺化呈現
 * 3. 計算詞彙間的餘弦相似度
 */

// ===========================
// 全域設定與狀態
// ===========================

// 詞彙分類顏色配置
const CATEGORY_COLORS = {
    animal: '#f472b6',   // 動物 - 粉紅色
    fruit: '#34d399',    // 水果 - 綠色
    vehicle: '#60a5fa',  // 交通工具 - 藍色
    emotion: '#fbbf24',  // 情感 - 黃色
    custom: '#c084fc'    // 自訂 - 紫色
};

// 預定義詞彙庫與其模擬向量
// 注意：這些向量是預先設計的，使相似類別的詞彙在 2D 空間中彼此靠近
const WORD_EMBEDDINGS = {
    // 動物類 - 集中在右上區域
    '貓': { category: 'animal', vec2d: [0.75, 0.65], vec4d: [0.8, 0.2, 0.5, 0.3], vec8d: [0.8, 0.2, 0.5, 0.3, 0.1, 0.7, 0.4, 0.6] },
    '狗': { category: 'animal', vec2d: [0.70, 0.70], vec4d: [0.7, 0.3, 0.6, 0.2], vec8d: [0.7, 0.3, 0.6, 0.2, 0.2, 0.6, 0.5, 0.5] },
    '鳥': { category: 'animal', vec2d: [0.80, 0.55], vec4d: [0.4, 0.1, 0.8, 0.9], vec8d: [0.4, 0.1, 0.8, 0.9, 0.3, 0.8, 0.2, 0.7] },
    '魚': { category: 'animal', vec2d: [0.85, 0.60], vec4d: [0.5, 0.2, 0.7, 0.8], vec8d: [0.5, 0.2, 0.7, 0.8, 0.4, 0.9, 0.3, 0.6] },
    '兔子': { category: 'animal', vec2d: [0.72, 0.72], vec4d: [0.75, 0.25, 0.55, 0.35], vec8d: [0.75, 0.25, 0.55, 0.35, 0.15, 0.65, 0.45, 0.55] },
    '老虎': { category: 'animal', vec2d: [0.68, 0.58], vec4d: [0.85, 0.15, 0.45, 0.25], vec8d: [0.85, 0.15, 0.45, 0.25, 0.05, 0.75, 0.35, 0.65] },

    // 水果類 - 集中在左下區域
    '蘋果': { category: 'fruit', vec2d: [0.25, 0.30], vec4d: [0.2, 0.9, 0.3, 0.1], vec8d: [0.2, 0.9, 0.3, 0.1, 0.8, 0.2, 0.9, 0.1] },
    '香蕉': { category: 'fruit', vec2d: [0.30, 0.25], vec4d: [0.3, 0.85, 0.25, 0.15], vec8d: [0.3, 0.85, 0.25, 0.15, 0.75, 0.25, 0.85, 0.15] },
    '橘子': { category: 'fruit', vec2d: [0.28, 0.35], vec4d: [0.25, 0.88, 0.28, 0.12], vec8d: [0.25, 0.88, 0.28, 0.12, 0.78, 0.22, 0.88, 0.12] },
    '葡萄': { category: 'fruit', vec2d: [0.22, 0.28], vec4d: [0.22, 0.92, 0.32, 0.08], vec8d: [0.22, 0.92, 0.32, 0.08, 0.82, 0.18, 0.92, 0.08] },
    '西瓜': { category: 'fruit', vec2d: [0.32, 0.32], vec4d: [0.28, 0.82, 0.22, 0.18], vec8d: [0.28, 0.82, 0.22, 0.18, 0.72, 0.28, 0.82, 0.18] },

    // 交通工具類 - 集中在右下區域
    '汽車': { category: 'vehicle', vec2d: [0.75, 0.25], vec4d: [0.9, 0.8, 0.1, 0.2], vec8d: [0.9, 0.8, 0.1, 0.2, 0.7, 0.3, 0.2, 0.8] },
    '機車': { category: 'vehicle', vec2d: [0.72, 0.28], vec4d: [0.85, 0.75, 0.15, 0.25], vec8d: [0.85, 0.75, 0.15, 0.25, 0.65, 0.35, 0.25, 0.75] },
    '腳踏車': { category: 'vehicle', vec2d: [0.70, 0.30], vec4d: [0.8, 0.7, 0.2, 0.3], vec8d: [0.8, 0.7, 0.2, 0.3, 0.6, 0.4, 0.3, 0.7] },
    '公車': { category: 'vehicle', vec2d: [0.78, 0.22], vec4d: [0.92, 0.82, 0.08, 0.18], vec8d: [0.92, 0.82, 0.08, 0.18, 0.72, 0.28, 0.18, 0.82] },
    '火車': { category: 'vehicle', vec2d: [0.80, 0.20], vec4d: [0.95, 0.85, 0.05, 0.15], vec8d: [0.95, 0.85, 0.05, 0.15, 0.75, 0.25, 0.15, 0.85] },

    // 情感類 - 集中在左上區域
    '開心': { category: 'emotion', vec2d: [0.20, 0.75], vec4d: [0.1, 0.3, 0.9, 0.7], vec8d: [0.1, 0.3, 0.9, 0.7, 0.5, 0.5, 0.8, 0.2] },
    '難過': { category: 'emotion', vec2d: [0.25, 0.68], vec4d: [0.15, 0.35, 0.85, 0.65], vec8d: [0.15, 0.35, 0.85, 0.65, 0.55, 0.45, 0.75, 0.25] },
    '生氣': { category: 'emotion', vec2d: [0.30, 0.72], vec4d: [0.2, 0.4, 0.8, 0.6], vec8d: [0.2, 0.4, 0.8, 0.6, 0.6, 0.4, 0.7, 0.3] },
    '害怕': { category: 'emotion', vec2d: [0.22, 0.70], vec4d: [0.12, 0.32, 0.88, 0.68], vec8d: [0.12, 0.32, 0.88, 0.68, 0.52, 0.48, 0.78, 0.22] },
    '驚訝': { category: 'emotion', vec2d: [0.28, 0.78], vec4d: [0.18, 0.38, 0.82, 0.72], vec8d: [0.18, 0.38, 0.82, 0.72, 0.58, 0.42, 0.72, 0.28] }
};

// 應用程式狀態管理
let state = {
    selectedWords: [],        // 已選擇的詞彙列表
    dimension: 4,             // 當前顯示的向量維度
    canvas: null,             // Canvas 元素參考
    ctx: null,                // Canvas 2D 繪圖上下文
    animationId: null         // 動畫 ID（用於取消動畫）
};

// ===========================
// 初始化
// ===========================

/**
 * 頁面載入完成後初始化應用程式
 */
document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    initControls();
    initWordPills();
    drawInitialCanvas();
});

/**
 * 初始化 Canvas 繪圖環境
 */
function initCanvas() {
    state.canvas = document.getElementById('embeddingCanvas');
    state.ctx = state.canvas.getContext('2d');
    
    // 處理高解析度螢幕的像素比例
    const dpr = window.devicePixelRatio || 1;
    const rect = state.canvas.getBoundingClientRect();
    
    // 設定 Canvas 實際尺寸（考慮像素比例）
    state.canvas.width = rect.width * dpr;
    state.canvas.height = rect.height * dpr;
    
    // 設定 CSS 顯示尺寸
    state.canvas.style.width = rect.width + 'px';
    state.canvas.style.height = rect.height + 'px';
    
    // 縮放繪圖上下文以匹配像素比例
    state.ctx.scale(dpr, dpr);
}

/**
 * 初始化控制元件事件監聽
 */
function initControls() {
    // 加入詞彙按鈕
    document.getElementById('addWordBtn').addEventListener('click', addCustomWord);
    
    // 輸入框 Enter 鍵事件
    document.getElementById('wordInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addCustomWord();
        }
    });
    
    // 視覺化按鈕
    document.getElementById('visualizeBtn').addEventListener('click', visualizeEmbeddings);
    
    // 清除按鈕
    document.getElementById('clearBtn').addEventListener('click', clearAll);
    
    // 計算相似度按鈕
    document.getElementById('calcSimilarityBtn').addEventListener('click', calculateSimilarity);
    
    // 維度選擇
    document.getElementById('dimensionSelect').addEventListener('change', (e) => {
        state.dimension = parseInt(e.target.value);
        updateVectorDisplay();
    });
}

/**
 * 初始化預設詞彙選項的點擊事件
 */
function initWordPills() {
    // 為所有詞彙選項添加點擊事件
    document.querySelectorAll('.word-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const word = pill.dataset.word;
            toggleWordSelection(word, pill);
        });
    });
}

// ===========================
// 詞彙選擇功能
// ===========================

/**
 * 切換詞彙的選擇狀態
 * @param {string} word - 詞彙文字
 * @param {HTMLElement} pillElement - 對應的 pill 元素（可選）
 */
function toggleWordSelection(word, pillElement = null) {
    const index = state.selectedWords.indexOf(word);
    
    if (index === -1) {
        // 新增詞彙
        addWordToSelection(word);
        if (pillElement) {
            pillElement.classList.add('selected');
        }
    } else {
        // 移除詞彙
        removeWordFromSelection(word);
        if (pillElement) {
            pillElement.classList.remove('selected');
        }
    }
}

/**
 * 將詞彙加入已選擇列表
 * @param {string} word - 詞彙文字
 */
function addWordToSelection(word) {
    if (state.selectedWords.includes(word)) {
        return; // 避免重複加入
    }
    
    state.selectedWords.push(word);
    renderSelectedWords();
    updateSimilaritySelectors();
}

/**
 * 從已選擇列表移除詞彙
 * @param {string} word - 詞彙文字
 */
function removeWordFromSelection(word) {
    const index = state.selectedWords.indexOf(word);
    if (index > -1) {
        state.selectedWords.splice(index, 1);
        
        // 同時更新 pill 元素的選擇狀態
        document.querySelectorAll('.word-pill').forEach(pill => {
            if (pill.dataset.word === word) {
                pill.classList.remove('selected');
            }
        });
        
        renderSelectedWords();
        updateSimilaritySelectors();
    }
}

/**
 * 新增自訂詞彙
 */
function addCustomWord() {
    const input = document.getElementById('wordInput');
    const word = input.value.trim();
    
    if (!word) {
        return;
    }
    
    // 檢查是否已經是預定義詞彙
    if (WORD_EMBEDDINGS[word]) {
        addWordToSelection(word);
        // 同時更新對應的 pill 元素狀態
        document.querySelectorAll('.word-pill').forEach(pill => {
            if (pill.dataset.word === word) {
                pill.classList.add('selected');
            }
        });
    } else {
        // 為自訂詞彙生成隨機向量
        generateCustomWordEmbedding(word);
        addWordToSelection(word);
    }
    
    input.value = '';
}

/**
 * 為自訂詞彙生成模擬向量
 * @param {string} word - 詞彙文字
 */
function generateCustomWordEmbedding(word) {
    // 使用詞彙的字元碼來生成偽隨機但一致的向量
    // 這確保相同的詞彙每次都會得到相同的向量
    let seed = 0;
    for (let i = 0; i < word.length; i++) {
        seed += word.charCodeAt(i) * (i + 1);
    }
    
    // 簡單的偽隨機數生成器（確保可重複）
    const random = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
    
    // 生成各維度的向量
    WORD_EMBEDDINGS[word] = {
        category: 'custom',
        vec2d: [0.35 + random() * 0.3, 0.35 + random() * 0.3],  // 放在中間區域
        vec4d: Array.from({ length: 4 }, () => Number(random().toFixed(2))),
        vec8d: Array.from({ length: 8 }, () => Number(random().toFixed(2)))
    };
}

/**
 * 渲染已選擇的詞彙列表
 */
function renderSelectedWords() {
    const container = document.getElementById('selectedWords');
    
    if (state.selectedWords.length === 0) {
        container.innerHTML = '<span class="placeholder-text">點擊下方詞彙或自行輸入加入</span>';
        return;
    }
    
    container.innerHTML = state.selectedWords.map(word => {
        const embedding = WORD_EMBEDDINGS[word];
        const category = embedding ? embedding.category : 'custom';
        
        return `
            <span class="selected-word ${category}">
                ${escapeHtml(word)}
                <span class="remove-word" onclick="removeWordFromSelection('${escapeHtml(word)}')">✕</span>
            </span>
        `;
    }).join('');
}

// ===========================
// 視覺化功能
// ===========================

/**
 * 繪製初始 Canvas 狀態
 */
function drawInitialCanvas() {
    const ctx = state.ctx;
    const width = state.canvas.getBoundingClientRect().width;
    const height = state.canvas.getBoundingClientRect().height;
    
    // 清除畫布
    ctx.clearRect(0, 0, width, height);
    
    // 繪製背景網格
    drawGrid(width, height);
    
    // 繪製座標軸
    drawAxes(width, height);
    
    // 繪製提示文字
    ctx.fillStyle = '#64748b';
    ctx.font = '16px "Noto Sans TC"';
    ctx.textAlign = 'center';
    ctx.fillText('選擇詞彙後點擊「視覺化嵌入空間」', width / 2, height / 2);
}

/**
 * 繪製背景網格
 */
function drawGrid(width, height) {
    const ctx = state.ctx;
    const gridSize = 40;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    // 繪製垂直線
    for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    
    // 繪製水平線
    for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
}

/**
 * 繪製座標軸
 */
function drawAxes(width, height) {
    const ctx = state.ctx;
    const padding = 40;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    
    // X 軸
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Y 軸
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(padding, padding);
    ctx.stroke();
    
    // 軸標籤
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px "Noto Sans TC"';
    ctx.textAlign = 'center';
    ctx.fillText('維度 1', width / 2, height - 10);
    
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('維度 2', 0, 0);
    ctx.restore();
}

/**
 * 執行嵌入空間視覺化
 */
function visualizeEmbeddings() {
    if (state.selectedWords.length === 0) {
        alert('請先選擇至少一個詞彙！');
        return;
    }
    
    const ctx = state.ctx;
    const width = state.canvas.getBoundingClientRect().width;
    const height = state.canvas.getBoundingClientRect().height;
    const padding = 60;
    
    // 清除畫布
    ctx.clearRect(0, 0, width, height);
    
    // 繪製背景
    drawGrid(width, height);
    drawAxes(width, height);
    
    // 計算繪圖區域
    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;
    
    // 使用動畫逐一顯示詞彙點
    let currentIndex = 0;
    
    const animatePoints = () => {
        if (currentIndex < state.selectedWords.length) {
            const word = state.selectedWords[currentIndex];
            const embedding = WORD_EMBEDDINGS[word];
            
            if (embedding) {
                // 計算 2D 空間中的座標
                const x = padding + embedding.vec2d[0] * plotWidth;
                const y = height - padding - embedding.vec2d[1] * plotHeight;
                
                // 繪製點
                drawPoint(ctx, x, y, word, CATEGORY_COLORS[embedding.category]);
            }
            
            currentIndex++;
            state.animationId = requestAnimationFrame(animatePoints);
        } else {
            // 動畫完成，繪製類別區域標示
            drawCategoryRegions(ctx, width, height, padding);
        }
    };
    
    animatePoints();
    
    // 更新向量顯示
    updateVectorDisplay();
}

/**
 * 繪製單個詞彙點
 */
function drawPoint(ctx, x, y, word, color) {
    // 外圈光暈效果
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 25);
    gradient.addColorStop(0, color + '40');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();
    
    // 內圈實心點
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // 詞彙標籤
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 14px "Noto Sans TC"';
    ctx.textAlign = 'center';
    ctx.fillText(word, x, y - 15);
}

/**
 * 繪製類別區域標示
 */
function drawCategoryRegions(ctx, width, height, padding) {
    const regions = [
        { name: '動物', x: width - 100, y: 80, color: CATEGORY_COLORS.animal },
        { name: '水果', x: 80, y: height - 80, color: CATEGORY_COLORS.fruit },
        { name: '交通', x: width - 100, y: height - 80, color: CATEGORY_COLORS.vehicle },
        { name: '情感', x: 80, y: 80, color: CATEGORY_COLORS.emotion }
    ];
    
    regions.forEach(region => {
        ctx.fillStyle = region.color + '30';
        ctx.strokeStyle = region.color + '60';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.roundRect(region.x - 30, region.y - 12, 60, 24, 12);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = region.color;
        ctx.font = '12px "Noto Sans TC"';
        ctx.textAlign = 'center';
        ctx.fillText(region.name, region.x, region.y + 4);
    });
}

// ===========================
// 向量顯示與相似度計算
// ===========================

/**
 * 更新向量顯示區域
 */
function updateVectorDisplay() {
    const container = document.getElementById('vectorDisplay');
    
    if (state.selectedWords.length === 0) {
        container.innerHTML = '<div class="placeholder-text">選擇詞彙後將顯示其向量表示</div>';
        return;
    }
    
    const dimension = state.dimension;
    
    container.innerHTML = state.selectedWords.map(word => {
        const embedding = WORD_EMBEDDINGS[word];
        if (!embedding) return '';
        
        // 根據選擇的維度獲取對應的向量
        let vector;
        switch (dimension) {
            case 2:
                vector = embedding.vec2d;
                break;
            case 4:
                vector = embedding.vec4d;
                break;
            case 8:
                vector = embedding.vec8d;
                break;
            default:
                vector = embedding.vec4d;
        }
        
        const color = CATEGORY_COLORS[embedding.category];
        
        return `
            <div class="vector-item" style="border-left: 3px solid ${color};">
                <div class="word-name" style="color: ${color};">${escapeHtml(word)}</div>
                <div class="vector-values">
                    ${vector.map((v, i) => `<span class="vec-val">d${i + 1}: ${v.toFixed(2)}</span>`).join('')}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * 更新相似度計算的下拉選單
 */
function updateSimilaritySelectors() {
    const word1Select = document.getElementById('word1Select');
    const word2Select = document.getElementById('word2Select');
    
    const options = '<option value="">選擇詞彙</option>' + 
        state.selectedWords.map(word => 
            `<option value="${escapeHtml(word)}">${escapeHtml(word)}</option>`
        ).join('');
    
    word1Select.innerHTML = options;
    word2Select.innerHTML = options;
}

/**
 * 計算並顯示餘弦相似度
 */
function calculateSimilarity() {
    const word1 = document.getElementById('word1Select').value;
    const word2 = document.getElementById('word2Select').value;
    const resultContainer = document.getElementById('similarityResult');
    
    if (!word1 || !word2) {
        alert('請選擇兩個詞彙！');
        return;
    }
    
    if (word1 === word2) {
        resultContainer.innerHTML = `
            <div class="similarity-value high">1.00</div>
            <p style="color: var(--text-secondary); margin-top: 0.5rem;">同一個詞彙，完全相同</p>
            <div class="similarity-bar"><div class="similarity-bar-fill" style="width: 100%; background: var(--success);"></div></div>
        `;
        return;
    }
    
    const embedding1 = WORD_EMBEDDINGS[word1];
    const embedding2 = WORD_EMBEDDINGS[word2];
    
    if (!embedding1 || !embedding2) {
        resultContainer.innerHTML = '<div class="placeholder-text">無法找到詞彙的向量</div>';
        return;
    }
    
    // 使用當前選擇的維度計算相似度
    let vec1, vec2;
    switch (state.dimension) {
        case 2:
            vec1 = embedding1.vec2d;
            vec2 = embedding2.vec2d;
            break;
        case 4:
            vec1 = embedding1.vec4d;
            vec2 = embedding2.vec4d;
            break;
        case 8:
            vec1 = embedding1.vec8d;
            vec2 = embedding2.vec8d;
            break;
        default:
            vec1 = embedding1.vec4d;
            vec2 = embedding2.vec4d;
    }
    
    // 計算餘弦相似度
    const similarity = cosineSimilarity(vec1, vec2);
    
    // 判斷相似度等級
    let levelClass, levelText;
    if (similarity >= 0.8) {
        levelClass = 'high';
        levelText = '非常相似';
    } else if (similarity >= 0.5) {
        levelClass = 'medium';
        levelText = '中等相似';
    } else {
        levelClass = 'low';
        levelText = '不太相似';
    }
    
    // 生成結果顯示
    const barColor = levelClass === 'high' ? 'var(--success)' : 
                     levelClass === 'medium' ? 'var(--warning)' : 'var(--error)';
    
    resultContainer.innerHTML = `
        <div class="similarity-value ${levelClass}">${similarity.toFixed(3)}</div>
        <p style="color: var(--text-secondary); margin-top: 0.5rem;">${levelText}</p>
        <div class="similarity-bar">
            <div class="similarity-bar-fill" style="width: ${similarity * 100}%; background: ${barColor};"></div>
        </div>
        <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 0.75rem;">
            使用 ${state.dimension}D 向量計算
        </p>
    `;
    
    // 在 Canvas 上繪製連線
    highlightSimilarity(word1, word2, similarity);
}

/**
 * 計算餘弦相似度
 * 公式：cos(θ) = (A · B) / (||A|| × ||B||)
 * 
 * @param {number[]} vec1 - 向量 1
 * @param {number[]} vec2 - 向量 2
 * @returns {number} 餘弦相似度（範圍 -1 到 1）
 */
function cosineSimilarity(vec1, vec2) {
    // 計算點積 (A · B)
    let dotProduct = 0;
    for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i];
    }
    
    // 計算向量長度 ||A|| 和 ||B||
    let magnitude1 = 0;
    let magnitude2 = 0;
    for (let i = 0; i < vec1.length; i++) {
        magnitude1 += vec1[i] * vec1[i];
        magnitude2 += vec2[i] * vec2[i];
    }
    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);
    
    // 避免除以零
    if (magnitude1 === 0 || magnitude2 === 0) {
        return 0;
    }
    
    // 計算餘弦相似度
    return dotProduct / (magnitude1 * magnitude2);
}

/**
 * 在 Canvas 上高亮顯示相似度連線
 */
function highlightSimilarity(word1, word2, similarity) {
    const ctx = state.ctx;
    const width = state.canvas.getBoundingClientRect().width;
    const height = state.canvas.getBoundingClientRect().height;
    const padding = 60;
    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;
    
    const embedding1 = WORD_EMBEDDINGS[word1];
    const embedding2 = WORD_EMBEDDINGS[word2];
    
    if (!embedding1 || !embedding2) return;
    
    const x1 = padding + embedding1.vec2d[0] * plotWidth;
    const y1 = height - padding - embedding1.vec2d[1] * plotHeight;
    const x2 = padding + embedding2.vec2d[0] * plotWidth;
    const y2 = height - padding - embedding2.vec2d[1] * plotHeight;
    
    // 繪製連線
    ctx.strokeStyle = similarity >= 0.5 ? '#22c55e80' : '#fbbf2480';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    ctx.setLineDash([]);
    
    // 在中點顯示相似度數值
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    
    ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
    ctx.beginPath();
    ctx.roundRect(midX - 30, midY - 12, 60, 24, 8);
    ctx.fill();
    
    ctx.fillStyle = similarity >= 0.5 ? '#22c55e' : '#fbbf24';
    ctx.font = 'bold 12px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText(similarity.toFixed(2), midX, midY + 4);
}

// ===========================
// 工具函數
// ===========================

/**
 * 清除所有選擇與畫布
 */
function clearAll() {
    // 停止動畫
    if (state.animationId) {
        cancelAnimationFrame(state.animationId);
        state.animationId = null;
    }
    
    // 清除選擇
    state.selectedWords = [];
    
    // 重置所有 pill 元素的選擇狀態
    document.querySelectorAll('.word-pill').forEach(pill => {
        pill.classList.remove('selected');
    });
    
    // 重新渲染
    renderSelectedWords();
    updateVectorDisplay();
    updateSimilaritySelectors();
    drawInitialCanvas();
    
    // 清除相似度結果
    document.getElementById('similarityResult').innerHTML = 
        '<div class="placeholder-text">選擇兩個詞彙計算相似度</div>';
    
    // 清除輸入框
    document.getElementById('wordInput').value = '';
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

// ===========================
// 讓函數可以在 HTML 中被呼叫
// ===========================
window.removeWordFromSelection = removeWordFromSelection;
