/**
 * 決策樹 (Decision Tree) 互動教學 - JavaScript 邏輯
 * 實作決策樹演算法 (CART-like) 與視覺化（包含樹狀圖）
 */

// ===========================
// 全域設定與狀態
// ===========================
const CONFIG = {
    CANVAS_WIDTH: 600,
    CANVAS_HEIGHT: 500,
    POINT_RADIUS: 6,
    TRAINING_POINTS_PER_CLASS: 30, // 增加點數以更好地展示決策邊界
};

// 顏色配置
const COLORS = {
    classA: '#f43f5e',
    classB: '#06b6d4',
    regionA: 'rgba(244, 63, 94, 0.2)',
    regionB: 'rgba(6, 182, 212, 0.2)',
    regionMix: 'rgba(255, 255, 255, 0.1)', // 不確定或混合區域
    splitLine: 'rgba(255, 255, 255, 0.3)',
    gridLine: 'rgba(255, 255, 255, 0.05)',
};

// 狀態管理
let state = {
    maxDepth: 3,
    criterion: 'gini', // 'gini' or 'entropy'
    data: [], // 二維資料點陣列，格式為 {x, y, label}
    tree: null, // 完整的決策樹
    prunedTree: null, // 依逐步演練步數修剪後的決策樹
    canvas: null,
    ctx: null,
    currentBrush: 'A', // 當前手動加點的類別：'A' (紅) 或 'B' (藍)
    currentTemplate: 'clusters', // 當前選擇的數據分佈模板
    hoveredNodeId: null, // 當前滑鼠懸浮的樹節點 path ID
    hoveredCanvasLeafId: null, // 當前滑鼠在 Canvas 上懸浮區域所屬的葉節點 ID
    selectedNodeId: null, // 當前點擊選中的樹節點路徑 ID (用於數學詳解)
    currentStep: 0, // 逐步建樹的目前步驟 (啟用的分割線數量)
    splits: [], // 完整樹中所有非葉節點按 BFS 排序的數組 (用於逐步演練)
    autoplayIntervalId: null, // 自動播放的定時器 ID
};

// ===========================
// 決策樹演算法核心
// ===========================

class Node {
    constructor() {
        this.left = null; // 左子樹 (X <= splitValue 或 Y <= splitValue)
        this.right = null; // 右子樹 (X > splitValue 或 Y > splitValue)
        this.splitFeature = null; // 切分的特徵名稱：'x' 或 'y'
        this.splitValue = null; // 切分的閾值
        this.predictedClass = null; // 該節點預測的類別：'A' 或 'B'
        this.isLeaf = false; // 是否為葉節點
        this.samples = 0; // 該節點涵蓋的樣本數
        this.classCounts = { A: 0, B: 0 }; // 類別統計數量
        this.impurity = 0; // 該節點的不純度值 (Gini 或 Entropy)
        this.id = ''; // 唯一的路徑識別碼，例如 'root', 'root-L', 'root-R'
        this.bounds = { minX: 0, maxX: 600, minY: 0, maxY: 500 }; // 該節點對應的特徵空間幾何邊界
    }
}

/**
 * 遞迴建立決策樹
 * @param {Array} data - 目前節點的數據集
 * @param {number} depth - 目前樹的深度
 * @param {Object} bounds - 目前節點的特徵空間邊界
 * @param {string} pathId - 節點唯一識別碼
 */
function buildTree(data, depth = 0, bounds = { minX: 0, maxX: CONFIG.CANVAS_WIDTH, minY: 0, maxY: CONFIG.CANVAS_HEIGHT }, pathId = 'root') {
    const node = new Node();
    node.samples = data.length;
    node.id = pathId;
    node.bounds = bounds;

    // 1. 計算該節點中各類別的點數量
    let countA = 0;
    let countB = 0;
    for (const p of data) {
        if (p.label === 'A') countA++;
        else countB++;
    }
    node.classCounts = { A: countA, B: countB };
    
    // 多數決 (Majority Vote) 決定該節點的預測類別
    node.predictedClass = countA >= countB ? 'A' : 'B';

    // 2. 計算當前節點的不純度
    if (state.criterion === 'gini') {
        node.impurity = giniImpurity(data);
    } else {
        node.impurity = entropy(data);
    }

    // 3. 終止條件檢查：
    // - 達到最大深度限制
    // - 資料完全純淨 (Gini 為 0)
    // - 樣本數過少，不足以繼續分割 (少於 2 個)
    if (depth >= state.maxDepth || countA === 0 || countB === 0 || data.length < 2) {
        node.isLeaf = true;
        return node;
    }

    // 4. 尋找最佳切分特徵與切分點
    const split = findBestSplit(data);

    // 如果找不到有效的切分，設為葉節點
    if (!split) {
        node.isLeaf = true;
        return node;
    }

    node.splitFeature = split.feature;
    node.splitValue = split.value;

    // 5. 根據最佳切分條件將資料分成左右兩組
    const leftData = data.filter(p => p[split.feature] <= split.value);
    const rightData = data.filter(p => p[split.feature] > split.value);

    // 如果切分後有一邊為空，則此切分無實質意義，強制設為葉節點
    if (leftData.length === 0 || rightData.length === 0) {
        node.isLeaf = true;
        return node;
    }

    // 6. 遞迴計算左右子樹對應的特徵空間幾何邊界
    const leftBounds = split.feature === 'x'
        ? { ...bounds, maxX: split.value }
        : { ...bounds, maxY: split.value };

    const rightBounds = split.feature === 'x'
        ? { ...bounds, minX: split.value }
        : { ...bounds, minY: split.value };

    // 7. 遞迴建立左右子節點
    node.left = buildTree(leftData, depth + 1, leftBounds, pathId + '-L');
    node.right = buildTree(rightData, depth + 1, rightBounds, pathId + '-R');

    return node;
}

/**
 * 尋找最佳切分特徵與分割閾值 (遍歷所有點的特徵值中點)
 */
function findBestSplit(data) {
    let bestGain = -Infinity; // 我們希望最大化不純度下降 (Information Gain)
    let bestSplit = null;
    const features = ['x', 'y'];
    
    // 計算父節點的不純度
    const parentImpurity = state.criterion === 'gini' ? giniImpurity(data) : entropy(data);

    // 遍歷所有特徵 (X 與 Y 軸)
    for (const feature of features) {
        // 先將資料點依據該特徵值排序
        const sortedData = [...data].sort((a, b) => a[feature] - b[feature]);

        // 嘗試每兩個相鄰點的中點作為切分線候選
        for (let i = 0; i < sortedData.length - 1; i++) {
            const p1 = sortedData[i];
            const p2 = sortedData[i + 1];

            // 跳過特徵值相同的點，無法在其間劃線
            if (p1[feature] === p2[feature]) continue;

            const splitValue = (p1[feature] + p2[feature]) / 2;

            // 分組
            const leftGroup = [];
            const rightGroup = [];
            for (const p of data) {
                if (p[feature] <= splitValue) leftGroup.push(p);
                else rightGroup.push(p);
            }

            if (leftGroup.length === 0 || rightGroup.length === 0) continue;

            // 計算切分後的加權不純度
            const total = data.length;
            const wLeft = leftGroup.length / total;
            const wRight = rightGroup.length / total;
            
            let splitImpurity = 0;
            if (state.criterion === 'gini') {
                splitImpurity = wLeft * giniImpurity(leftGroup) + wRight * giniImpurity(rightGroup);
            } else {
                splitImpurity = wLeft * entropy(leftGroup) + wRight * entropy(rightGroup);
            }

            // 計算不純度下降量 (Gain = Parent - Weighted Children)
            const gain = parentImpurity - splitImpurity;

            // 尋找最大下降量（即最能把資料分乾淨的切分線）
            if (gain > bestGain) {
                bestGain = gain;
                bestSplit = { feature, value: splitValue };
            }
        }
    }

    return bestSplit;
}

/**
 * 計算單個分組的 Gini 不純度
 * Gini = 1 - p_A^2 - p_B^2
 */
function giniImpurity(group) {
    if (group.length === 0) return 0;

    let countA = 0;
    for (const p of group) {
        if (p.label === 'A') countA++;
    }
    const pA = countA / group.length;
    const pB = 1 - pA; // 雙類別問題

    return 1 - (pA * pA + pB * pB);
}

/**
 * 計算單個分組的資訊熵 (Entropy)
 * Entropy = - p_A*log2(p_A) - p_B*log2(p_B)
 */
function entropy(group) {
    if (group.length === 0) return 0;

    let countA = 0;
    for (const p of group) {
        if (p.label === 'A') countA++;
    }
    const pA = countA / group.length;
    const pB = 1 - pA;

    // 防止 log2(0) 產生 NaN
    const log2A = pA === 0 ? 0 : Math.log2(pA);
    const log2B = pB === 0 ? 0 : Math.log2(pB);

    return -(pA * log2A + pB * log2B);
}

// ===========================
// 逐步演練與修剪機制 (Pruning & Steps)
// ===========================

/**
 * 使用 BFS 廣度優先搜尋，依序收集所有「非葉節點」的分割點，用於逐步演示
 */
function collectSplits(root) {
    if (!root || root.isLeaf) return [];
    const queue = [root];
    const splits = [];
    while (queue.length > 0) {
        const node = queue.shift();
        splits.push(node);
        if (node.left && !node.left.isLeaf) queue.push(node.left);
        if (node.right && !node.right.isLeaf) queue.push(node.right);
    }
    return splits;
}

/**
 * 依據允許的分割數，將完整的樹做修剪，超過允許分割步數的節點將被強製視為葉節點
 */
function getPrunedTree(node, maxSplitsAllowed, splitsList) {
    if (!node) return null;

    if (node.isLeaf) {
        return copyNodeAsLeaf(node);
    }

    // 檢查這個分裂點是否在目前步數允許的範圍內
    const splitIndex = splitsList.indexOf(node);
    if (splitIndex === -1 || splitIndex >= maxSplitsAllowed) {
        // 此分割點在目前步數尚未啟用，直接將其當作葉節點渲染，並保留其目前的類別多數決與樣本統計
        return copyNodeAsLeaf(node);
    }

    // 若分割已啟用，複製該節點，並遞迴其子樹
    const clone = new Node();
    clone.id = node.id;
    clone.bounds = { ...node.bounds };
    clone.samples = node.samples;
    clone.classCounts = { ...node.classCounts };
    clone.predictedClass = node.predictedClass;
    clone.impurity = node.impurity;
    clone.isLeaf = false;
    clone.splitFeature = node.splitFeature;
    clone.splitValue = node.splitValue;

    clone.left = getPrunedTree(node.left, maxSplitsAllowed, splitsList);
    clone.right = getPrunedTree(node.right, maxSplitsAllowed, splitsList);

    return clone;
}

/**
 * 輔助方法：複製某個節點並強製設為葉節點
 */
function copyNodeAsLeaf(node) {
    const leaf = new Node();
    leaf.id = node.id;
    leaf.bounds = { ...node.bounds };
    leaf.samples = node.samples;
    leaf.classCounts = { ...node.classCounts };
    leaf.predictedClass = node.predictedClass;
    leaf.impurity = node.impurity;
    leaf.isLeaf = true;
    return leaf;
}

// ===========================
// 統計與分析
// ===========================

function getTreeStats(node) {
    if (!node) return { nodes: 0, leaves: 0 };
    if (node.isLeaf) return { nodes: 1, leaves: 1 };

    const leftStats = getTreeStats(node.left);
    const rightStats = getTreeStats(node.right);

    return {
        nodes: 1 + leftStats.nodes + rightStats.nodes,
        leaves: leftStats.leaves + rightStats.leaves
    };
}

function calculateAccuracy(tree, data) {
    if (data.length === 0) return 0;
    let correct = 0;
    for (const p of data) {
        if (predict(tree, p) === p.label) correct++;
    }
    return Math.round((correct / data.length) * 100);
}

function predict(node, point) {
    if (node.isLeaf) return node.predictedClass;
    if (point[node.splitFeature] <= node.splitValue) {
        return predict(node.left, point);
    } else {
        return predict(node.right, point);
    }
}

// ===========================
// 初始化與 DOM 事件
// ===========================

document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    initControls();
    // 預設生成 Clusters 聚類資料
    generateTemplateData('clusters');
    updateModel();
});

function initCanvas() {
    state.canvas = document.getElementById('treeCanvas');
    state.ctx = state.canvas.getContext('2d');

    // 處理 Retina 螢幕高分率模糊問題
    const dpr = window.devicePixelRatio || 1;
    const rect = state.canvas.getBoundingClientRect();
    state.canvas.width = rect.width * dpr;
    state.canvas.height = rect.height * dpr;
    state.ctx.scale(dpr, dpr);

    // 記錄畫布實際寬高
    CONFIG.CANVAS_WIDTH = rect.width;
    CONFIG.CANVAS_HEIGHT = rect.height;

    state.canvas.style.width = rect.width + 'px';
    state.canvas.style.height = rect.height + 'px';
}

function initControls() {
    const depthSlider = document.getElementById('depthSlider');
    const depthValue = document.getElementById('depthValue');
    const criterionSelect = document.getElementById('criterionSelect');
    const resetBtn = document.getElementById('resetBtn');
    const randomBtn = document.getElementById('randomBtn');

    // 1. 深度與分割準則
    depthSlider.addEventListener('input', (e) => {
        state.maxDepth = parseInt(e.target.value);
        depthValue.textContent = state.maxDepth;
        updateModel();
    });

    criterionSelect.addEventListener('change', (e) => {
        state.criterion = e.target.value;
        updateModel();
    });

    // 重新隨機生成當前模板資料
    randomBtn.addEventListener('click', () => {
        stopAutoplay();
        generateTemplateData(state.currentTemplate);
        updateModel();
    });

    // 重置參數
    resetBtn.addEventListener('click', () => {
        stopAutoplay();
        state.maxDepth = 3;
        state.criterion = 'gini';
        depthSlider.value = 3;
        depthValue.textContent = 3;
        criterionSelect.value = 'gini';
        state.currentTemplate = 'clusters';
        document.getElementById('dataTemplate').value = 'clusters';
        generateTemplateData('clusters');
        updateModel();
    });

    // 2. 畫筆與清除按鈕
    const brushA = document.getElementById('brushA');
    const brushB = document.getElementById('brushB');
    const clearBtn = document.getElementById('clearBtn');
    const canvasHint = document.getElementById('canvasHint');

    brushA.addEventListener('click', () => {
        state.currentBrush = 'A';
        brushA.classList.add('active');
        brushB.classList.remove('active');
    });

    brushB.addEventListener('click', () => {
        state.currentBrush = 'B';
        brushA.classList.remove('active');
        brushB.classList.add('active');
    });

    clearBtn.addEventListener('click', () => {
        stopAutoplay();
        state.data = [];
        state.currentTemplate = 'custom';
        document.getElementById('dataTemplate').value = 'custom';
        updateModel();
        // 顯示提示文字
        canvasHint.classList.remove('hidden');
    });

    // 3. 模板下拉選單切換
    const dataTemplate = document.getElementById('dataTemplate');
    dataTemplate.addEventListener('change', (e) => {
        stopAutoplay();
        state.currentTemplate = e.target.value;
        generateTemplateData(state.currentTemplate);
        updateModel();
        
        if (state.data.length > 0) {
            canvasHint.classList.add('hidden');
        } else {
            canvasHint.classList.remove('hidden');
        }
    });

    // 4. 手動在 Canvas 點擊加點
    state.canvas.addEventListener('mousedown', (e) => {
        stopAutoplay();
        const rect = state.canvas.getBoundingClientRect();
        // 換算 CSS 坐標（相對於 Canvas 元件）
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (x < 0 || x > CONFIG.CANVAS_WIDTH || y < 0 || y > CONFIG.CANVAS_HEIGHT) return;

        // 新增點
        state.data.push({
            x: x,
            y: y,
            label: state.currentBrush
        });

        // 隱藏提示
        canvasHint.classList.add('hidden');
        
        // 切換為手動繪製模式
        if (state.currentTemplate !== 'custom') {
            state.currentTemplate = 'custom';
            document.getElementById('dataTemplate').value = 'custom';
        }

        updateModel();
    });

    // 5. 滑鼠在 Canvas 移動以高亮其所屬之空間區域（雙向高亮：Canvas -> 樹 DOM）
    state.canvas.addEventListener('mousemove', (e) => {
        const rect = state.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (state.prunedTree) {
            const foundLeaf = findLeafNode(state.prunedTree, x, y);
            if (foundLeaf && foundLeaf.id !== state.hoveredCanvasLeafId) {
                state.hoveredCanvasLeafId = foundLeaf.id;
                render();
                renderTreeStructure(); // 重繪樹狀圖以更新高亮 CSS 樣式
            }
        }
    });

    state.canvas.addEventListener('mouseleave', () => {
        if (state.hoveredCanvasLeafId !== null) {
            state.hoveredCanvasLeafId = null;
            render();
            renderTreeStructure();
        }
    });

    // 6. 逐步演練按鈕控制
    const stepReset = document.getElementById('stepReset');
    const stepBack = document.getElementById('stepBack');
    const stepForward = document.getElementById('stepForward');
    const stepAutoplay = document.getElementById('stepAutoplay');

    stepReset.addEventListener('click', () => {
        stopAutoplay();
        state.currentStep = 0;
        updatePrunedModel();
    });

    stepBack.addEventListener('click', () => {
        stopAutoplay();
        if (state.currentStep > 0) {
            state.currentStep--;
            updatePrunedModel();
        }
    });

    stepForward.addEventListener('click', () => {
        stopAutoplay();
        if (state.currentStep < state.splits.length) {
            state.currentStep++;
            updatePrunedModel();
        }
    });

    stepAutoplay.addEventListener('click', () => {
        if (state.autoplayIntervalId) {
            stopAutoplay();
        } else {
            startAutoplay();
        }
    });
}

// ===========================
// 資料生成與模板 (Data Generation)
// ===========================

function generateTemplateData(templateType) {
    state.data = [];
    const W = CONFIG.CANVAS_WIDTH;
    const H = CONFIG.CANVAS_HEIGHT;

    if (templateType === 'custom') {
        return; // 手動繪製，清空所有點
    }

    if (templateType === 'clusters') {
        // 1. 隨機聚類：二維空間中的經典四個群聚
        const centersA = [
            { x: W * 0.3, y: H * 0.3 },
            { x: W * 0.8, y: H * 0.8 }
        ];
        const centersB = [
            { x: W * 0.7, y: H * 0.3 },
            { x: W * 0.3, y: H * 0.7 }
        ];

        for (let i = 0; i < CONFIG.TRAINING_POINTS_PER_CLASS / 2; i++) {
            centersA.forEach(c => {
                state.data.push({
                    x: Math.max(15, Math.min(W - 15, c.x + gaussianRandom() * 45)),
                    y: Math.max(15, Math.min(H - 15, c.y + gaussianRandom() * 45)),
                    label: 'A'
                });
            });
            centersB.forEach(c => {
                state.data.push({
                    x: Math.max(15, Math.min(W - 15, c.x + gaussianRandom() * 45)),
                    y: Math.max(15, Math.min(H - 15, c.y + gaussianRandom() * 45)),
                    label: 'B'
                });
            });
        }
    } else if (templateType === 'rings') {
        // 2. 同心圓環：展示決策樹如何分階梯圍包住一個圓形
        const centerX = W / 2;
        const centerY = H / 2;
        
        // 類別 A：内圓
        for (let i = 0; i < CONFIG.TRAINING_POINTS_PER_CLASS; i++) {
            const r = Math.random() * 80;
            const theta = Math.random() * Math.PI * 2;
            state.data.push({
                x: centerX + r * Math.cos(theta) + gaussianRandom() * 4,
                y: centerY + r * Math.sin(theta) + gaussianRandom() * 4,
                label: 'A'
            });
        }
        // 類別 B：外圓環
        for (let i = 0; i < CONFIG.TRAINING_POINTS_PER_CLASS; i++) {
            const r = 135 + Math.random() * 70;
            const theta = Math.random() * Math.PI * 2;
            state.data.push({
                x: centerX + r * Math.cos(theta) + gaussianRandom() * 8,
                y: centerY + r * Math.sin(theta) + gaussianRandom() * 8,
                label: 'B'
            });
        }
    } else if (templateType === 'chessboard') {
        // 3. 棋盤格：3x3 的交錯網格，極適合展示過度擬合 (Overfitting)
        const cols = 3;
        const rows = 3;
        const colW = W / cols;
        const rowH = H / rows;

        for (let i = 0; i < 70; i++) {
            const x = Math.random() * W;
            const y = Math.random() * H;
            const c = Math.floor(x / colW);
            const r = Math.floor(y / rowH);
            // 棋盤交錯標籤
            const label = (c + r) % 2 === 0 ? 'A' : 'B';
            
            state.data.push({
                x: Math.max(10, Math.min(W - 10, x)),
                y: Math.max(10, Math.min(H - 10, y)),
                label: label
            });
        }
    } else if (templateType === 'diagonal') {
        // 4. 對角斜線：對角線切割，展示決策樹只能水平垂直切割所產生的「階梯狀」侷限
        const k = H / W;
        for (let i = 0; i < 60; i++) {
            const x = Math.random() * W;
            const y = Math.random() * H;
            // 對角邊界：y = x * (H/W)
            const targetY = x * k;
            const label = y < targetY ? 'A' : 'B';
            
            state.data.push({
                x: Math.max(10, Math.min(W - 10, x)),
                y: Math.max(10, Math.min(H - 10, y)),
                label: label
            });
        }
    }
}

function gaussianRandom() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// ===========================
// 逐步演練播放控制器 (Autoplay)
// ===========================

function startAutoplay() {
    const btn = document.getElementById('stepAutoplay');
    btn.classList.add('active-autoplay');
    btn.innerHTML = '⏸️'; // 改為暫停圖標

    // 如果已經在最後一步，重置回起點再播放
    if (state.currentStep >= state.splits.length) {
        state.currentStep = 0;
        updatePrunedModel();
    }

    state.autoplayIntervalId = setInterval(() => {
        if (state.currentStep < state.splits.length) {
            state.currentStep++;
            updatePrunedModel();
        } else {
            stopAutoplay();
        }
    }, 1200); // 每 1.2 秒前進一步
}

function stopAutoplay() {
    if (state.autoplayIntervalId) {
        clearInterval(state.autoplayIntervalId);
        state.autoplayIntervalId = null;
    }
    const btn = document.getElementById('stepAutoplay');
    btn.classList.remove('active-autoplay');
    btn.innerHTML = '⏩'; // 還原為播放圖標
}

// ===========================
// 模型更新與修剪演算法更新流 (Rendering Orchestrator)
// ===========================

function updateModel() {
    // 1. 訓練一棵完整的決策樹
    state.tree = buildTree(state.data);

    // 2. 收集該樹中所有的切分特徵節點，以進行逐步分割演示
    state.splits = collectSplits(state.tree);

    // 3. 如果當前演練步驟溢出 (例如因為修改參數導致樹變淺)，對其進行限制
    if (state.currentStep > state.splits.length) {
        state.currentStep = state.splits.length;
    }
    
    // 如果是載入新資料或剛切換參數，預設直接展示完整訓練好的樹
    if (state.currentStep === 0 && state.splits.length > 0 && state.data.length > 0) {
        state.currentStep = state.splits.length;
    }

    // 4. 更新並繪製經修剪過的模型
    updatePrunedModel();
}

/**
 * 依據目前逐步演練的步驟，對完整樹進行剪枝並重繪
 */
function updatePrunedModel() {
    // 1. 取得剪枝後的子樹
    state.prunedTree = getPrunedTree(state.tree, state.currentStep, state.splits);

    // 2. 更新步驟狀態計數器
    document.getElementById('currentStep').textContent = state.currentStep;
    document.getElementById('totalSteps').textContent = state.splits.length;

    // 3. 更新當前修剪後狀態下的統計指標
    const stats = getTreeStats(state.prunedTree);
    document.getElementById('nodeCount').textContent = stats.nodes;
    document.getElementById('leafCount').textContent = stats.leaves;
    document.getElementById('accuracy').textContent = calculateAccuracy(state.prunedTree, state.data) + '%';

    // 4. 重繪畫布
    render();

    // 5. 重繪樹狀圖
    renderTreeStructure();

    // 6. 若點選了節點，更新數學解析卡片
    if (state.selectedNodeId) {
        // 在當前修剪後的樹中搜尋該節點
        function findNodeById(curr) {
            if (!curr) return null;
            if (curr.id === state.selectedNodeId) return curr;
            const l = findNodeById(curr.left);
            if (l) return l;
            return findNodeById(curr.right);
        }
        const updatedSelectedNode = findNodeById(state.prunedTree);
        updateMathPanel(updatedSelectedNode);
    } else {
        updateMathPanel(null);
    }
}

// ===========================
// 畫布與高亮繪製流程 (Canvas Drawers)
// ===========================

function render() {
    clearCanvas();
    // 1. 繪製背景分割色塊（決策區域）
    drawDecisionBoundaries(state.prunedTree, 0, CONFIG.CANVAS_WIDTH, 0, CONFIG.CANVAS_HEIGHT);
    // 2. 繪製選中/懸浮節點的特徵空間高亮框
    drawHighlights();
    // 3. 繪製最上層的資料點
    drawPoints();
}

function clearCanvas() {
    state.ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    // 背景深黑色
    state.ctx.fillStyle = '#0f172a';
    state.ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
}

/**
 * 遞迴繪製剪枝後的所有決策背景區域與虛線切分線
 */
function drawDecisionBoundaries(node, minX, maxX, minY, maxY) {
    if (!node) return;

    if (node.isLeaf) {
        // 葉節點：使用淡紅色 (A) 或淡藍色 (B) 填充整個代表的特徵區域
        state.ctx.fillStyle = node.predictedClass === 'A' ? COLORS.regionA : COLORS.regionB;
        state.ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
        return;
    }

    // 內部節點：繪製分割參考線
    state.ctx.beginPath();
    state.ctx.strokeStyle = COLORS.splitLine;
    state.ctx.lineWidth = 1.5;
    state.ctx.setLineDash([4, 4]); // 點虛線

    if (node.splitFeature === 'x') {
        const x = node.splitValue;
        state.ctx.moveTo(x, minY);
        state.ctx.lineTo(x, maxY);
        state.ctx.stroke();
        state.ctx.setLineDash([]); // 還原實線

        // 遞迴繪製左右子樹
        drawDecisionBoundaries(node.left, minX, x, minY, maxY);
        drawDecisionBoundaries(node.right, x, maxX, minY, maxY);
    } else {
        const y = node.splitValue;
        state.ctx.moveTo(minX, y);
        state.ctx.lineTo(maxX, y);
        state.ctx.stroke();
        state.ctx.setLineDash([]); // 還原實線

        // 遞迴繪製上下子樹
        drawDecisionBoundaries(node.left, minX, maxX, minY, y);
        drawDecisionBoundaries(node.right, minX, maxX, y, maxY);
    }
}

/**
 * 繪製選中、懸停樹節點時，對應在畫布空間區域上的半透明遮罩與發光框
 */
function drawHighlights() {
    const searchId = state.hoveredNodeId || state.selectedNodeId || state.hoveredCanvasLeafId;
    if (!searchId) return;

    // 搜尋目前剪枝樹中對應 ID 的節點
    function findNodeById(curr) {
        if (!curr) return null;
        if (curr.id === searchId) return curr;
        const l = findNodeById(curr.left);
        if (l) return l;
        return findNodeById(curr.right);
    }

    const activeNode = findNodeById(state.prunedTree);
    if (!activeNode) return;

    const b = activeNode.bounds;
    
    // 1. 繪製半透明黃色覆蓋層
    state.ctx.fillStyle = 'rgba(250, 204, 21, 0.12)';
    state.ctx.fillRect(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY);

    // 2. 繪製高亮金色邊框
    state.ctx.strokeStyle = '#facc15';
    state.ctx.lineWidth = 2.5;
    state.ctx.strokeRect(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY);

    // 3. 如果是切分內部節點，加粗並高亮其決策切分線
    if (!activeNode.isLeaf) {
        state.ctx.beginPath();
        state.ctx.strokeStyle = '#facc15';
        state.ctx.lineWidth = 4;
        state.ctx.setLineDash([8, 4]); // 寬虛線
        if (activeNode.splitFeature === 'x') {
            state.ctx.moveTo(activeNode.splitValue, b.minY);
            state.ctx.lineTo(activeNode.splitValue, b.maxY);
        } else {
            state.ctx.moveTo(b.minX, activeNode.splitValue);
            state.ctx.lineTo(b.maxX, activeNode.splitValue);
        }
        state.ctx.stroke();
        state.ctx.setLineDash([]); // 還原
    }
}

function drawPoints() {
    state.data.forEach(p => {
        state.ctx.beginPath();
        state.ctx.arc(p.x, p.y, CONFIG.POINT_RADIUS, 0, Math.PI * 2);
        // 使用類別顏色
        state.ctx.fillStyle = p.label === 'A' ? COLORS.classA : COLORS.classB;
        state.ctx.fill();

        // 精緻的白色發光外框，使點更立體
        state.ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        state.ctx.lineWidth = 1.5;
        state.ctx.stroke();
    });
}

// ===========================
// 輔助遞迴查詢與連動 (Linkage Helpers)
// ===========================

/**
 * 依據畫布上的 (x, y) 坐標遞迴搜尋其所屬的葉節點 (Canvas -> Tree)
 */
function findLeafNode(node, x, y) {
    if (!node) return null;
    if (node.isLeaf) return node;
    
    if (node.splitFeature === 'x') {
        if (x <= node.splitValue) return findLeafNode(node.left, x, y);
        return findLeafNode(node.right, x, y);
    } else {
        if (y <= node.splitValue) return findLeafNode(node.left, x, y);
        return findLeafNode(node.right, x, y);
    }
}

// ===========================
// 樹狀結構 DOM 渲染 (Tree DOM Builders)
// ===========================

function renderTreeStructure() {
    const container = document.getElementById('treeStructure');
    container.innerHTML = ''; // 清空舊的樹狀 DOM

    if (!state.prunedTree) {
        container.innerHTML = '<p class="math-placeholder">請添加資料以生成決策樹</p>';
        return;
    }

    const treeDOM = createTreeNodeDOM(state.prunedTree);
    container.appendChild(treeDOM);
}

/**
 * 遞迴建立決策樹的 HTML 樹狀分支節點
 */
function createTreeNodeDOM(node) {
    const nodeEl = document.createElement('div');
    nodeEl.className = 'node';
    if (node.isLeaf) nodeEl.classList.add('is-leaf');

    // 1. 建立節點卡片
    const contentEl = document.createElement('div');
    contentEl.className = 'node-content tf-nc';
    contentEl.setAttribute('data-id', node.id);

    // 套用高亮樣式 (Hover)
    if (node.id === state.hoveredNodeId || node.id === state.hoveredCanvasLeafId) {
        contentEl.classList.add('highlight');
    }
    // 套用點選樣式 (Selected)
    if (node.id === state.selectedNodeId) {
        contentEl.style.outline = '2.5px solid #facc15';
        contentEl.style.outlineOffset = '2px';
        contentEl.style.boxShadow = '0 0 15px rgba(250, 204, 21, 0.4)';
    }

    // 寫入卡片 HTML
    if (node.isLeaf) {
        contentEl.classList.add('node-leaf');
        contentEl.classList.add(node.predictedClass === 'A' ? 'leaf-a' : 'leaf-b');
        contentEl.innerHTML = `
            <div>${node.predictedClass === 'A' ? '類別 A' : '類別 B'}</div>
            <div class="node-stats">A:${node.classCounts.A} / B:${node.classCounts.B}</div>
        `;
    } else {
        contentEl.classList.add('node-internal');
        const featureName = node.splitFeature.toUpperCase();
        contentEl.innerHTML = `
            <div class="condition">${featureName} ≤ ${Math.round(node.splitValue)}</div>
            <div class="node-stats">樣本: ${node.samples}</div>
        `;
    }

    // 綁定雙向滑鼠高亮事件 (Tree -> Canvas)
    contentEl.addEventListener('mouseenter', () => {
        state.hoveredNodeId = node.id;
        render(); // 更新 Canvas 高亮邊框
        contentEl.classList.add('highlight');
    });

    contentEl.addEventListener('mouseleave', () => {
        state.hoveredNodeId = null;
        render(); // 取消 Canvas 高亮
        contentEl.classList.remove('highlight');
    });

    // 點擊事件：載入該節點的動態數學公式詳解卡片
    contentEl.addEventListener('click', (e) => {
        e.stopPropagation();
        state.selectedNodeId = node.id;
        updateMathPanel(node);
        renderTreeStructure(); // 更新點擊外框線
    });

    nodeEl.appendChild(contentEl);

    // 2. 遞迴建立左右分裂子節點
    if (!node.isLeaf) {
        const childrenEl = document.createElement('div');
        childrenEl.className = 'node-children';

        if (node.left) {
            childrenEl.appendChild(createTreeNodeDOM(node.left));
        }
        if (node.right) {
            childrenEl.appendChild(createTreeNodeDOM(node.right));
        }

        nodeEl.appendChild(childrenEl);
    }

    return nodeEl;
}

// ===========================
// 動態數學解析卡片渲染器 (Math Renderer)
// ===========================

function updateMathPanel(node) {
    const mathContent = document.getElementById('mathContent');
    if (!node) {
        mathContent.innerHTML = '<p class="math-placeholder">👆 點擊樹狀圖中的任一節點，即可查看該節點的不純度計算過程</p>';
        return;
    }

    const n = node.samples;
    const nA = node.classCounts.A;
    const nB = node.classCounts.B;
    const pA = n > 0 ? (nA / n).toFixed(3) : 0;
    const pB = n > 0 ? (nB / n).toFixed(3) : 0;

    let html = '';
    
    // 1. 節點基本資訊
    html += `
        <div class="math-section" style="margin-bottom: 12px; border-bottom: 1px solid var(--glass-border); padding-bottom: 10px;">
            <strong style="color: var(--text-primary); font-size: 0.95rem; display: block; margin-bottom: 4px;">
                ${node.isLeaf ? '🍃 葉節點' : '🔱 分割節點'} (${node.id.toUpperCase()})
            </strong>
            <span style="font-size: 0.82rem; color: var(--text-secondary);">
                此區域包含樣本數：<strong>${n}</strong> (類別 A: <span style="color:var(--class-a-light)">${nA}</span>, 類別 B: <span style="color:var(--class-b-light)">${nB}</span>)
            </span>
        </div>
    `;

    // 2. 機率比例
    html += `
        <div class="math-section" style="margin-bottom: 12px;">
            <div class="math-label" style="font-size: 0.8rem; font-weight: 500; color: var(--text-secondary); margin-bottom: 4px;">1. 計算類別機率 (Probability)：</div>
            <div style="font-family: monospace; font-size: 0.8rem; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px; border: 1px solid var(--glass-border); line-height: 1.5;">
                p<sub>A</sub> = ${nA} / ${n} = <strong style="color:var(--class-a-light)">${pA}</strong><br>
                p<sub>B</sub> = ${nB} / ${n} = <strong style="color:var(--class-b-light)">${pB}</strong>
            </div>
        </div>
    `;

    // 3. 不純度公式代入計算
    const val = node.impurity.toFixed(4);
    if (state.criterion === 'gini') {
        html += `
            <div class="math-section" style="margin-bottom: 12px;">
                <div class="math-label" style="font-size: 0.8rem; font-weight: 500; color: var(--text-secondary); margin-bottom: 4px;">2. Gini 不純度計算：</div>
                <div class="math-formula" style="font-size: 0.85rem; font-weight: 600; color: var(--primary-light); background: rgba(99,102,241,0.1); border-radius: 6px; padding: 8px; text-align: center; margin-bottom: 6px; font-family: monospace;">
                    Gini = 1 - p<sub>A</sub>² - p<sub>B</sub>²
                </div>
                <div style="font-family: monospace; font-size: 0.8rem; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px; border: 1px solid var(--glass-border); line-height: 1.5;">
                    Gini = 1 - (${pA})² - (${pB})²<br>
                    &nbsp;&nbsp;&nbsp;&nbsp; = 1 - ${(pA * pA).toFixed(4)} - ${(pB * pB).toFixed(4)}<br>
                    &nbsp;&nbsp;&nbsp;&nbsp; = <strong style="color:var(--success); font-size: 0.9rem;">${val}</strong>
                </div>
            </div>
        `;
    } else {
        const log2A = nA === 0 ? 0 : Math.log2(nA / n);
        const log2B = nB === 0 ? 0 : Math.log2(nB / n);
        const termA = pA * log2A;
        const termB = pB * log2B;

        html += `
            <div class="math-section" style="margin-bottom: 12px;">
                <div class="math-label" style="font-size: 0.8rem; font-weight: 500; color: var(--text-secondary); margin-bottom: 4px;">2. 資訊熵 (Entropy) 計算：</div>
                <div class="math-formula" style="font-size: 0.85rem; font-weight: 600; color: var(--primary-light); background: rgba(99,102,241,0.1); border-radius: 6px; padding: 8px; text-align: center; margin-bottom: 6px; font-family: monospace;">
                    H(D) = -p<sub>A</sub>log₂(p<sub>A</sub>) - p<sub>B</sub>log₂(p<sub>B</sub>)
                </div>
                <div style="font-family: monospace; font-size: 0.78rem; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px; border: 1px solid var(--glass-border); line-height: 1.5;">
                    Entropy = -(${pA} &times; ${log2A.toFixed(3)}) - (${pB} &times; ${log2B.toFixed(3)})<br>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; = -(${termA.toFixed(4)}) - (${termB.toFixed(4)})<br>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; = <strong style="color:var(--success); font-size: 0.9rem;">${val}</strong>
                </div>
            </div>
        `;
    }

    // 4. 若為內部切分點，顯示切分效益與不純度下降 (Information Gain)
    if (!node.isLeaf && node.left && node.right) {
        const parentImp = node.impurity;
        const leftImp = node.left.impurity;
        const rightImp = node.right.impurity;
        const wLeft = node.left.samples / n;
        const wRight = node.right.samples / n;
        const splitImp = wLeft * leftImp + wRight * rightImp;
        const gain = parentImp - splitImp;
        const metricName = state.criterion === 'gini' ? 'Gini' : 'Entropy';

        html += `
            <div class="math-section" style="border-top: 1px dashed var(--glass-border); padding-top: 10px; margin-top: 10px;">
                <div class="math-label" style="font-size: 0.8rem; font-weight: bold; color: var(--text-primary); margin-bottom: 4px; display:flex; align-items:center; gap:4px;">
                    ⚡ 切分效益 (不純度下降量)：
                </div>
                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 4px;">
                    分割條件：<strong style="color: var(--primary-light)">${node.splitFeature.toUpperCase()} ≤ ${Math.round(node.splitValue)}</strong>
                </div>
                <div style="font-family: monospace; font-size: 0.76rem; background: rgba(0,0,0,0.25); padding: 8px; border-radius: 6px; border: 1px solid var(--glass-border); line-height: 1.45;">
                    • 左子區 (${node.left.samples} 點)：${metricName} = ${leftImp.toFixed(3)}<br>
                    • 右子區 (${node.right.samples} 點)：${metricName} = ${rightImp.toFixed(3)}<br>
                    • 分割後加權不純度：<br>
                    &nbsp;&nbsp;(${node.left.samples}/${n} &times; ${leftImp.toFixed(3)}) + (${node.right.samples}/${n} &times; ${rightImp.toFixed(3)}) = ${splitImp.toFixed(4)}<br>
                    • <strong>不純度下降 (Gain)</strong>：<br>
                    &nbsp;&nbsp;${parentImp.toFixed(4)} - ${splitImp.toFixed(4)} = <strong style="color:#facc15; font-size: 0.85rem;">${gain.toFixed(4)}</strong>
                </div>
                <p style="font-size: 0.74rem; color: var(--text-muted); margin-top: 6px; line-height: 1.3;">
                    💡 決策樹演算法會遍歷所有可能的切分點，選擇使<strong>「不純度下降最多 (Gain 最大)」</strong>的特徵與數值進行切割。
                </p>
            </div>
        `;
    }

    mathContent.innerHTML = html;
}
