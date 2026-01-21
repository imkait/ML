/**
 * 多重感知器 (MLP) 互動教學 - JavaScript 邏輯
 * 實作神經網路的視覺化與互動功能
 */

// ===========================
// 全域設定與狀態
// ===========================
const CONFIG = {
    INPUT_NODES: 3,
    OUTPUT_NODES: 2,
    NODE_RADIUS: 24,
    LAYER_SPACING: 180,
    ANIMATION_DURATION: 1500,
};

// 顏色配置
const COLORS = {
    nodeInput: '#22d3ee',
    nodeHidden: '#a78bfa',
    nodeOutput: '#f472b6',
    nodeActive: '#fbbf24',
    weightPositive: '#22c55e',
    weightNegative: '#ef4444',
    text: 'rgba(255, 255, 255, 0.9)',
    textMuted: 'rgba(255, 255, 255, 0.5)',
};

// 狀態管理
let state = {
    hiddenNodes: 4,
    canvas: null,
    ctx: null,
    canvasWidth: 0,
    canvasHeight: 0,
    nodes: [],          // 所有節點 [{x, y, layer, index, value, bias}]
    weights: [],        // 權重 [fromIndex][toIndex]
    isAnimating: false,
    selectedNode: null,
    hoveredNode: null,
};

// ===========================
// 初始化
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    initControls();
    initNetwork();
    render();
});

/**
 * 初始化 Canvas
 */
function initCanvas() {
    state.canvas = document.getElementById('networkCanvas');
    state.ctx = state.canvas.getContext('2d');

    // 處理高 DPI 螢幕
    const dpr = window.devicePixelRatio || 1;
    const rect = state.canvas.getBoundingClientRect();

    state.canvas.width = rect.width * dpr;
    state.canvas.height = rect.height * dpr;
    state.ctx.scale(dpr, dpr);

    state.canvas.style.width = rect.width + 'px';
    state.canvas.style.height = rect.height + 'px';

    state.canvasWidth = rect.width;
    state.canvasHeight = rect.height;

    // 事件監聽
    state.canvas.addEventListener('click', handleCanvasClick);
    state.canvas.addEventListener('mousemove', handleCanvasMove);
    state.canvas.addEventListener('mouseleave', handleCanvasLeave);
}

/**
 * 初始化控制元件
 */
function initControls() {
    const hiddenSlider = document.getElementById('hiddenSlider');
    const hiddenValue = document.getElementById('hiddenValue');
    const forwardBtn = document.getElementById('forwardBtn');
    const resetBtn = document.getElementById('resetBtn');

    // 隱藏層節點數滑桿
    hiddenSlider.addEventListener('input', (e) => {
        state.hiddenNodes = parseInt(e.target.value);
        hiddenValue.textContent = state.hiddenNodes;
        initNetwork();
        render();
    });

    // 前向傳播按鈕
    forwardBtn.addEventListener('click', () => {
        if (!state.isAnimating) {
            runForwardPropagation();
        }
    });

    // 重置權重按鈕
    resetBtn.addEventListener('click', () => {
        initNetwork();
        render();
        showNodeInfo(null);
    });
}

/**
 * 初始化神經網路結構
 */
function initNetwork() {
    state.nodes = [];
    state.weights = [];

    const layers = [CONFIG.INPUT_NODES, state.hiddenNodes, CONFIG.OUTPUT_NODES];
    const totalLayers = layers.length;

    // 計算層的水平位置
    const startX = 100;
    const endX = state.canvasWidth - 100;
    const layerSpacing = (endX - startX) / (totalLayers - 1);

    let nodeIndex = 0;

    // 建立節點
    for (let l = 0; l < totalLayers; l++) {
        const nodesInLayer = layers[l];
        const x = startX + l * layerSpacing;
        const totalHeight = (nodesInLayer - 1) * 70;
        const startY = (state.canvasHeight - totalHeight) / 2;

        for (let i = 0; i < nodesInLayer; i++) {
            const y = startY + i * 70;
            state.nodes.push({
                x: x,
                y: y,
                layer: l,
                index: i,
                globalIndex: nodeIndex,
                value: l === 0 ? Math.random().toFixed(2) : 0,
                bias: l > 0 ? (Math.random() * 2 - 1).toFixed(2) : 0,
                activated: false,
            });
            nodeIndex++;
        }
    }

    // 建立權重矩陣
    initWeights(layers);
}

/**
 * 初始化權重
 */
function initWeights(layers) {
    state.weights = [];

    let fromStart = 0;
    for (let l = 0; l < layers.length - 1; l++) {
        const fromCount = layers[l];
        const toCount = layers[l + 1];
        const toStart = fromStart + fromCount;

        for (let i = 0; i < fromCount; i++) {
            for (let j = 0; j < toCount; j++) {
                const weight = (Math.random() * 2 - 1).toFixed(2);
                state.weights.push({
                    from: fromStart + i,
                    to: toStart + j,
                    value: parseFloat(weight),
                });
            }
        }
        fromStart = toStart;
    }
}

/**
 * Sigmoid 激活函數
 */
function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
}

// ===========================
// 事件處理
// ===========================

/**
 * 處理 Canvas 點擊
 */
function handleCanvasClick(event) {
    const rect = state.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const clickedNode = findNodeAtPosition(x, y);
    if (clickedNode) {
        state.selectedNode = clickedNode;
        showNodeInfo(clickedNode);
        render();
    }
}

/**
 * 處理滑鼠移動
 */
function handleCanvasMove(event) {
    const rect = state.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const hoveredNode = findNodeAtPosition(x, y);
    if (hoveredNode !== state.hoveredNode) {
        state.hoveredNode = hoveredNode;
        state.canvas.style.cursor = hoveredNode ? 'pointer' : 'default';
        render();
    }
}

/**
 * 處理滑鼠離開
 */
function handleCanvasLeave() {
    state.hoveredNode = null;
    render();
}

/**
 * 找到指定位置的節點
 */
function findNodeAtPosition(x, y) {
    for (const node of state.nodes) {
        const dx = x - node.x;
        const dy = y - node.y;
        if (dx * dx + dy * dy <= CONFIG.NODE_RADIUS * CONFIG.NODE_RADIUS) {
            return node;
        }
    }
    return null;
}

/**
 * 顯示節點資訊
 */
function showNodeInfo(node) {
    const infoDiv = document.getElementById('nodeInfo');

    if (!node) {
        infoDiv.innerHTML = '<p class="info-hint">點擊任意節點查看詳細資訊</p>';
        return;
    }

    const layerNames = ['輸入層', '隱藏層', '輸出層'];
    const layerName = layerNames[node.layer];
    const colorClass = ['input-color', 'hidden-color', 'output-color'][node.layer];

    let html = `<div class="node-details">`;
    html += `<div class="detail-row">
                <span class="detail-label">層別</span>
                <span class="detail-value ${colorClass}">${layerName}</span>
             </div>`;
    html += `<div class="detail-row">
                <span class="detail-label">節點編號</span>
                <span class="detail-value">${node.layer === 0 ? 'x' : (node.layer === 1 ? 'h' : 'y')}${node.index + 1}</span>
             </div>`;
    html += `<div class="detail-row">
                <span class="detail-label">輸出值</span>
                <span class="detail-value ${colorClass}">${parseFloat(node.value).toFixed(4)}</span>
             </div>`;

    if (node.layer > 0) {
        html += `<div class="detail-row">
                    <span class="detail-label">偏差 b</span>
                    <span class="detail-value">${node.bias}</span>
                 </div>`;
    }

    html += `</div>`;
    infoDiv.innerHTML = html;
}

// ===========================
// 前向傳播動畫
// ===========================

/**
 * 執行前向傳播動畫
 */
function runForwardPropagation() {
    state.isAnimating = true;

    // 重置所有節點狀態
    state.nodes.forEach(node => {
        node.activated = false;
        if (node.layer === 0) {
            node.value = Math.random().toFixed(2);
        } else {
            node.value = 0;
        }
    });

    // 動畫流程
    animateLayer(0);
}

/**
 * 動畫單一層
 */
function animateLayer(layerIndex) {
    const nodesInLayer = state.nodes.filter(n => n.layer === layerIndex);

    // 激活當前層
    nodesInLayer.forEach(node => {
        node.activated = true;
    });
    render();

    if (layerIndex < 2) {
        // 計算下一層
        setTimeout(() => {
            calculateNextLayer(layerIndex);
            animateLayer(layerIndex + 1);
        }, CONFIG.ANIMATION_DURATION / 3);
    } else {
        // 動畫結束
        setTimeout(() => {
            state.isAnimating = false;
            render();
        }, CONFIG.ANIMATION_DURATION / 3);
    }
}

/**
 * 計算下一層節點的值
 */
function calculateNextLayer(currentLayer) {
    const currentNodes = state.nodes.filter(n => n.layer === currentLayer);
    const nextNodes = state.nodes.filter(n => n.layer === currentLayer + 1);

    nextNodes.forEach(nextNode => {
        let sum = parseFloat(nextNode.bias);

        currentNodes.forEach(currentNode => {
            const weight = state.weights.find(
                w => w.from === currentNode.globalIndex && w.to === nextNode.globalIndex
            );
            if (weight) {
                sum += parseFloat(currentNode.value) * weight.value;
            }
        });

        nextNode.value = sigmoid(sum).toFixed(4);
    });
}

// ===========================
// 渲染
// ===========================

/**
 * 主渲染函數
 */
function render() {
    clearCanvas();
    drawConnections();
    drawNodes();
    drawLabels();
    drawCalculationFormula();
}

/**
 * 清除畫布
 */
function clearCanvas() {
    const gradient = state.ctx.createLinearGradient(0, 0, 0, state.canvasHeight);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');

    state.ctx.fillStyle = gradient;
    state.ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);
}

/**
 * 繪製連線（權重）
 */
function drawConnections() {
    state.weights.forEach(weight => {
        const fromNode = state.nodes[weight.from];
        const toNode = state.nodes[weight.to];

        // 權重顏色與粗細
        const isPositive = weight.value >= 0;
        const color = isPositive ? COLORS.weightPositive : COLORS.weightNegative;
        const lineWidth = Math.abs(weight.value) * 3 + 0.5;

        // 如果正在動畫且兩個節點都激活
        const isActive = state.isAnimating && fromNode.activated && toNode.activated;

        state.ctx.beginPath();
        state.ctx.moveTo(fromNode.x, fromNode.y);
        state.ctx.lineTo(toNode.x, toNode.y);

        if (isActive) {
            state.ctx.strokeStyle = COLORS.nodeActive;
            state.ctx.lineWidth = lineWidth + 2;
            state.ctx.shadowColor = COLORS.nodeActive;
            state.ctx.shadowBlur = 15;
        } else {
            state.ctx.strokeStyle = color;
            state.ctx.lineWidth = lineWidth;
            state.ctx.globalAlpha = 0.6;
            state.ctx.shadowBlur = 0;
        }

        state.ctx.stroke();
        state.ctx.globalAlpha = 1;
        state.ctx.shadowBlur = 0;
    });
}

/**
 * 繪製節點
 */
function drawNodes() {
    state.nodes.forEach(node => {
        const colors = [COLORS.nodeInput, COLORS.nodeHidden, COLORS.nodeOutput];
        let nodeColor = colors[node.layer];

        const isSelected = state.selectedNode && state.selectedNode.globalIndex === node.globalIndex;
        const isHovered = state.hoveredNode && state.hoveredNode.globalIndex === node.globalIndex;
        const isActive = node.activated && state.isAnimating;

        // 發光效果
        if (isActive) {
            state.ctx.shadowColor = COLORS.nodeActive;
            state.ctx.shadowBlur = 25;
            nodeColor = COLORS.nodeActive;
        } else if (isSelected || isHovered) {
            state.ctx.shadowColor = nodeColor;
            state.ctx.shadowBlur = 20;
        } else {
            state.ctx.shadowColor = nodeColor;
            state.ctx.shadowBlur = 10;
        }

        // 繪製節點圓形
        state.ctx.beginPath();
        state.ctx.arc(node.x, node.y, CONFIG.NODE_RADIUS, 0, Math.PI * 2);
        state.ctx.fillStyle = nodeColor;
        state.ctx.fill();

        // 選中外框
        if (isSelected) {
            state.ctx.strokeStyle = 'white';
            state.ctx.lineWidth = 3;
            state.ctx.stroke();
        }

        state.ctx.shadowBlur = 0;

        // 節點內的值
        state.ctx.fillStyle = node.layer === 0 ? '#000' : '#fff';
        state.ctx.font = 'bold 12px Noto Sans TC';
        state.ctx.textAlign = 'center';
        state.ctx.textBaseline = 'middle';

        const displayValue = parseFloat(node.value).toFixed(2);
        state.ctx.fillText(displayValue, node.x, node.y);
    });
}

/**
 * 繪製層標籤
 */
function drawLabels() {
    const labels = ['輸入層', '隱藏層', '輸出層'];
    const layers = [0, 1, 2];

    state.ctx.font = '14px Noto Sans TC';
    state.ctx.fillStyle = COLORS.textMuted;
    state.ctx.textAlign = 'center';

    layers.forEach((layer, idx) => {
        const nodesInLayer = state.nodes.filter(n => n.layer === layer);
        if (nodesInLayer.length > 0) {
            const x = nodesInLayer[0].x;
            state.ctx.fillText(labels[idx], x, 30);
        }
    });
}

/**
 * 繪製選中節點的計算公式
 */
function drawCalculationFormula() {
    // 只有選中隱藏層或輸出層節點時才顯示
    if (!state.selectedNode || state.selectedNode.layer === 0) {
        return;
    }

    const node = state.selectedNode;
    const prevLayer = node.layer - 1;
    const prevNodes = state.nodes.filter(n => n.layer === prevLayer);

    // 收集連接到此節點的權重
    const incomingWeights = state.weights.filter(w => w.to === node.globalIndex);

    // 建立計算式資料
    let formulaData = [];     // 儲存每個項目的權重和輸入值
    let resultParts = [];     // 顯示計算結果

    prevNodes.forEach((prevNode, idx) => {
        const weight = incomingWeights.find(w => w.from === prevNode.globalIndex);
        if (weight) {
            const inputValue = parseFloat(prevNode.value);
            const weightValue = weight.value;
            const product = weightValue * inputValue;

            // 判斷符號
            const isFirst = idx === 0;
            const signSymbol = weightValue >= 0 ? (isFirst ? '' : ' + ') : ' - ';
            const absWeight = Math.abs(weightValue).toFixed(2);

            // 儲存每個項目的資料
            formulaData.push({
                sign: signSymbol,
                weight: absWeight,
                inputValue: inputValue.toFixed(2),
                isFirst: isFirst
            });

            // 結果：乘積結果
            const resultSign = product >= 0 ? (isFirst ? '' : ' + ') : ' - ';
            resultParts.push(`${resultSign}${Math.abs(product).toFixed(3)}`);
        }
    });

    // 計算 z 值
    let zValue = parseFloat(node.bias);
    prevNodes.forEach(prevNode => {
        const weight = incomingWeights.find(w => w.from === prevNode.globalIndex);
        if (weight) {
            zValue += parseFloat(prevNode.value) * weight.value;
        }
    });

    const nodeLabel = node.layer === 1 ? `h${node.index + 1}` : `y${node.index + 1}`;
    const biasValue = parseFloat(node.bias);
    const biasSign = biasValue >= 0 ? ' + ' : ' - ';
    const biasAbs = Math.abs(biasValue).toFixed(2);

    // 繪製背景區域（增加高度以容納三行）
    const boxHeight = 85;
    const boxY = state.canvasHeight - boxHeight - 10;
    const boxX = 20;
    const boxWidth = state.canvasWidth - 40;

    state.ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
    state.ctx.strokeStyle = 'rgba(167, 139, 250, 0.5)';
    state.ctx.lineWidth = 2;
    state.ctx.beginPath();
    state.ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 10);
    state.ctx.fill();
    state.ctx.stroke();

    // 繪製標題
    const colors = [COLORS.nodeInput, COLORS.nodeHidden, COLORS.nodeOutput];
    state.ctx.fillStyle = colors[node.layer];
    state.ctx.font = 'bold 14px Noto Sans TC';
    state.ctx.textAlign = 'left';
    state.ctx.textBaseline = 'top';
    state.ctx.fillText(`節點 ${nodeLabel} 計算過程：`, boxX + 15, boxY + 10);

    // 繪製公式
    state.ctx.font = '12px Courier New, monospace';
    const lineHeight = 18;
    let currentY = boxY + 32;

    // 第一行：z = w×x（帶入實際數值，輸入值用前一層顏色）
    // 前一層的顏色：隱藏層計算時用輸入層色，輸出層計算時用隱藏層色
    const inputColor = colors[prevLayer];  // 前一層節點的顏色
    const weightColor = COLORS.text;       // 權重用白色

    let xPos = boxX + 15;
    state.ctx.fillStyle = weightColor;
    state.ctx.fillText('z = ', xPos, currentY);
    xPos += state.ctx.measureText('z = ').width;

    formulaData.forEach((item, idx) => {
        // 繪製符號和權重（白色）
        state.ctx.fillStyle = weightColor;
        const weightPart = `${item.sign}${item.weight}×`;
        state.ctx.fillText(weightPart, xPos, currentY);
        xPos += state.ctx.measureText(weightPart).width;

        // 繪製輸入值（前一層節點顏色）
        state.ctx.fillStyle = inputColor;
        state.ctx.fillText(item.inputValue, xPos, currentY);
        xPos += state.ctx.measureText(item.inputValue).width;
    });

    // 繪製偏差項（白色）
    state.ctx.fillStyle = weightColor;
    state.ctx.fillText(`${biasSign}${biasAbs}`, xPos, currentY);

    // 第二行：計算結果
    currentY += lineHeight;
    state.ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
    const resultStr = `  = ${resultParts.join('')}${biasSign}${biasAbs} = ${zValue.toFixed(4)}`;
    state.ctx.fillText(resultStr, boxX + 15, currentY);

    // 第三行：激活函數結果
    currentY += lineHeight;
    state.ctx.fillStyle = 'rgba(244, 114, 182, 0.9)';
    const activationStr = `  → σ(${zValue.toFixed(4)}) = ${parseFloat(node.value).toFixed(4)}`;
    state.ctx.fillText(activationStr, boxX + 15, currentY);
}

// ===========================
// 視窗大小調整
// ===========================
window.addEventListener('resize', () => {
    clearTimeout(window.resizeTimeout);
    window.resizeTimeout = setTimeout(() => {
        initCanvas();
        initNetwork();
        render();
    }, 250);
});
