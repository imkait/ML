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
    data: [], // Array of {x, y, label}
    tree: null,
    canvas: null,
    ctx: null,
};

// ===========================
// 決策樹演算法核心
// ===========================

class Node {
    constructor() {
        this.left = null;
        this.right = null;
        this.splitFeature = null; // 'x' or 'y'
        this.splitValue = null;
        this.predictedClass = null; // 'A' or 'B' (for leaf nodes)
        this.isLeaf = false;
        this.samples = 0;
        this.classCounts = { A: 0, B: 0 };
    }
}

/**
 * 建立決策樹
 */
function buildTree(data, depth = 0) {
    const node = new Node();
    node.samples = data.length;

    // 計算類別數量
    let countA = 0;
    let countB = 0;
    for (const p of data) {
        if (p.label === 'A') countA++;
        else countB++;
    }
    node.classCounts = { A: countA, B: countB };
    node.predictedClass = countA >= countB ? 'A' : 'B';

    // 終止條件：
    // 1. 達到最大深度
    // 2. 資料純度為 1 (只有一種類別)
    // 3. 資料量太少
    if (depth >= state.maxDepth || countA === 0 || countB === 0 || data.length < 2) {
        node.isLeaf = true;
        return node;
    }

    // 尋找最佳切分
    const split = findBestSplit(data);

    // 如果找不到有效的切分（例如所有點重疊），則設為葉節點
    if (!split) {
        node.isLeaf = true;
        return node;
    }

    node.splitFeature = split.feature;
    node.splitValue = split.value;

    // 分割資料
    const leftData = data.filter(p => p[split.feature] <= split.value);
    const rightData = data.filter(p => p[split.feature] > split.value);

    // 如果分割無效（一邊為空），強制設為葉節點
    if (leftData.length === 0 || rightData.length === 0) {
        node.isLeaf = true;
        return node;
    }

    // 遞迴建立子樹
    node.left = buildTree(leftData, depth + 1);
    node.right = buildTree(rightData, depth + 1);

    return node;
}

/**
 * 尋找最佳切分點
 */
function findBestSplit(data) {
    let bestGini = Infinity; // or min entropy
    let bestSplit = null;
    const features = ['x', 'y'];

    // 遍歷特徵
    for (const feature of features) {
        // 為了效能，我們可以只隨機取樣一些切分點，或者使用所有點的中點
        // 這裡簡單起見，嘗試所有數據點的值
        // 先排序以優化
        const sortedData = [...data].sort((a, b) => a[feature] - b[feature]);

        for (let i = 0; i < sortedData.length - 1; i++) {
            const p1 = sortedData[i];
            const p2 = sortedData[i + 1];

            // 跳過相同值的點
            if (p1[feature] === p2[feature]) continue;

            const splitValue = (p1[feature] + p2[feature]) / 2;

            // 分組
            const leftGroup = [];
            const rightGroup = [];
            for (const p of data) {
                if (p[feature] <= splitValue) leftGroup.push(p);
                else rightGroup.push(p);
            }

            // 計算 Cost (Imupurity)
            const impurity = calculateCost(leftGroup, rightGroup);

            if (impurity < bestGini) {
                bestGini = impurity;
                bestSplit = { feature, value: splitValue };
            }
        }
    }

    return bestSplit;
}

/**
 * 計算分割後的加權不純度
 */
function calculateCost(left, right) {
    const total = left.length + right.length;
    const wLeft = left.length / total;
    const wRight = right.length / total;

    if (state.criterion === 'gini') {
        return wLeft * giniImpurity(left) + wRight * giniImpurity(right);
    } else {
        return wLeft * entropy(left) + wRight * entropy(right);
    }
}

/**
 * Gini 不純度 = 1 - sum(p_i^2)
 */
function giniImpurity(group) {
    if (group.length === 0) return 0;

    let countA = 0;
    for (const p of group) {
        if (p.label === 'A') countA++;
    }
    const pA = countA / group.length;
    const pB = 1 - pA; // only 2 classes

    return 1 - (pA * pA + pB * pB);
}

/**
 * Entropy = - sum(p_i * log2(p_i))
 */
function entropy(group) {
    if (group.length === 0) return 0;

    let countA = 0;
    for (const p of group) {
        if (p.label === 'A') countA++;
    }
    const pA = countA / group.length;
    const pB = 1 - pA;

    // 防止 log(0)
    const log2A = pA === 0 ? 0 : Math.log2(pA);
    const log2B = pB === 0 ? 0 : Math.log2(pB);

    return -(pA * log2A + pB * log2B);
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
    generateRandomData();
    updateModel();
});

// ... initCanvas logic remains mostly same ...
function initCanvas() {
    state.canvas = document.getElementById('treeCanvas');
    state.ctx = state.canvas.getContext('2d');

    // 處理高 DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = state.canvas.getBoundingClientRect();
    state.canvas.width = rect.width * dpr;
    state.canvas.height = rect.height * dpr;
    state.ctx.scale(dpr, dpr);

    // 更新配置中的實際寬高
    CONFIG.CANVAS_WIDTH = rect.width;
    CONFIG.CANVAS_HEIGHT = rect.height;

    // 確保 CSS 顯示正確
    state.canvas.style.width = rect.width + 'px';
    state.canvas.style.height = rect.height + 'px';
}

function initControls() {
    const depthSlider = document.getElementById('depthSlider');
    const depthValue = document.getElementById('depthValue');
    const criterionSelect = document.getElementById('criterionSelect');
    const resetBtn = document.getElementById('resetBtn');
    const randomBtn = document.getElementById('randomBtn');

    depthSlider.addEventListener('input', (e) => {
        state.maxDepth = parseInt(e.target.value);
        depthValue.textContent = state.maxDepth;
        updateModel();
    });

    criterionSelect.addEventListener('change', (e) => {
        state.criterion = e.target.value;
        updateModel();
    });

    randomBtn.addEventListener('click', () => {
        generateRandomData();
        updateModel();
    });

    resetBtn.addEventListener('click', () => {
        // 重置為預設狀態
        state.maxDepth = 3;
        state.criterion = 'gini';
        depthSlider.value = 3;
        depthValue.textContent = 3;
        criterionSelect.value = 'gini';
        generateRandomData();
        updateModel();
    });
}

// ===========================
// 資料生成與渲染流程
// ===========================

function generateRandomData() {
    state.data = [];

    // 類別 A：左上與右下的混合
    const centersA = [
        { x: CONFIG.CANVAS_WIDTH * 0.3, y: CONFIG.CANVAS_HEIGHT * 0.3 },
        { x: CONFIG.CANVAS_WIDTH * 0.8, y: CONFIG.CANVAS_HEIGHT * 0.8 }
    ];

    // 類別 B：右上與左下的混合
    const centersB = [
        { x: CONFIG.CANVAS_WIDTH * 0.7, y: CONFIG.CANVAS_HEIGHT * 0.3 },
        { x: CONFIG.CANVAS_WIDTH * 0.3, y: CONFIG.CANVAS_HEIGHT * 0.7 }
    ];

    for (let i = 0; i < CONFIG.TRAINING_POINTS_PER_CLASS / 2; i++) {
        // A
        centersA.forEach(center => {
            state.data.push({
                x: center.x + gaussianRandom() * 50,
                y: center.y + gaussianRandom() * 50,
                label: 'A'
            });
        });

        // B
        centersB.forEach(center => {
            state.data.push({
                x: center.x + gaussianRandom() * 50,
                y: center.y + gaussianRandom() * 50,
                label: 'B'
            });
        });
    }
}

function gaussianRandom() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function updateModel() {
    // 1. 訓練決策樹
    state.tree = buildTree(state.data);

    // 2. 更新統計數據
    const stats = getTreeStats(state.tree);
    document.getElementById('nodeCount').textContent = stats.nodes;
    document.getElementById('leafCount').textContent = stats.leaves;
    document.getElementById('accuracy').textContent = calculateAccuracy(state.tree, state.data) + '%';

    // 3. 渲染 Canvas
    render();

    // 4. 渲染樹狀圖
    renderTreeStructure();
}

function render() {
    clearCanvas();
    // 1. 繪製決策邊界 (遞迴繪製區域)
    drawDecisionBoundaries(state.tree, 0, CONFIG.CANVAS_WIDTH, 0, CONFIG.CANVAS_HEIGHT);
    // 2. 繪製資料點
    drawPoints();
}

/**
 * 渲染樹狀圖結構到 DOM
 */
function renderTreeStructure() {
    const container = document.getElementById('treeStructure');
    container.innerHTML = ''; // Clear previous tree

    if (!state.tree) return;

    const treeDOM = createTreeNodeDOM(state.tree);
    container.appendChild(treeDOM);
}

/**
 * 遞迴建立樹節點 DOM
 */
function createTreeNodeDOM(node) {
    const nodeEl = document.createElement('div');
    nodeEl.className = 'node';
    if (node.isLeaf) nodeEl.classList.add('is-leaf');

    // 1. 節點內容 (Node Content)
    const contentEl = document.createElement('div');
    contentEl.className = 'node-content tf-nc';

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
    nodeEl.appendChild(contentEl);

    // 2. 子節點 (Children Wrapper)
    if (!node.isLeaf) {
        const childrenEl = document.createElement('div');
        childrenEl.className = 'node-children';

        // Left child
        if (node.left) {
            childrenEl.appendChild(createTreeNodeDOM(node.left));
        }

        // Right child
        if (node.right) {
            childrenEl.appendChild(createTreeNodeDOM(node.right));
        }

        nodeEl.appendChild(childrenEl);
    }

    return nodeEl;
}

function clearCanvas() {
    state.ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    // 背景色（深色）
    state.ctx.fillStyle = '#1e293b';
    state.ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
}

/**
 * 遞迴繪製決策區域
 */
function drawDecisionBoundaries(node, minX, maxX, minY, maxY) {
    if (!node) return;

    if (node.isLeaf) {
        state.ctx.fillStyle = node.predictedClass === 'A' ? COLORS.regionA : COLORS.regionB;
        state.ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
        return;
    }

    // 繪製分割線
    state.ctx.beginPath();
    state.ctx.strokeStyle = COLORS.splitLine;
    state.ctx.lineWidth = 1;

    if (node.splitFeature === 'x') {
        // 垂直線
        const x = node.splitValue;
        state.ctx.moveTo(x, minY);
        state.ctx.lineTo(x, maxY);
        state.ctx.stroke();

        drawDecisionBoundaries(node.left, minX, x, minY, maxY);
        drawDecisionBoundaries(node.right, x, maxX, minY, maxY);
    } else {
        // 水平線
        const y = node.splitValue;
        state.ctx.moveTo(minX, y);
        state.ctx.lineTo(maxX, y);
        state.ctx.stroke();

        drawDecisionBoundaries(node.left, minX, maxX, minY, y);
        drawDecisionBoundaries(node.right, minX, maxX, y, maxY);
    }
}

function drawPoints() {
    state.data.forEach(p => {
        state.ctx.beginPath();
        state.ctx.arc(p.x, p.y, CONFIG.POINT_RADIUS, 0, Math.PI * 2);
        state.ctx.fillStyle = p.label === 'A' ? COLORS.classA : COLORS.classB;
        state.ctx.fill();

        // 邊框
        state.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        state.ctx.lineWidth = 1.5;
        state.ctx.stroke();
    });
}
