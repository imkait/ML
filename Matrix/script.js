/**
 * 混淆矩陣與評估指標 - 互動邏輯
 */

// ===========================
// 全域設定與狀態
// ===========================
const CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 320,
    PADDING: 40,
    POINT_RADIUS: 3,
};

const COLORS = {
    positive: '#22c55e', // Green for Actual Positive
    negative: '#3b82f6', // Blue for Actual Negative
    tp: 'rgba(34, 197, 94, 0.4)',
    tn: 'rgba(59, 130, 246, 0.4)',
    fp: 'rgba(244, 63, 94, 0.4)',  // Red for False Positive
    fn: 'rgba(245, 158, 11, 0.4)', // Amber for False Negative
    threshold: '#f1f5f9',
    axis: '#cbd5e1',
};

let state = {
    threshold: 50,    // 0-100
    overlap: 40,      // 0-100
    sampleSize: 200,  // Total samples
    data: [],         // Array of { value, label (0 or 1), prediction (0 or 1) }
    isDragging: false,
    canvas: null,
    ctx: null,
};

// ===========================
// 初始化
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    generateData();
    initControls();
    update();
});

function initCanvas() {
    state.canvas = document.getElementById('matrixCanvas');
    state.ctx = state.canvas.getContext('2d');

    // Handle High DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = state.canvas.getBoundingClientRect();
    state.canvas.width = rect.width * dpr;
    state.canvas.height = rect.height * dpr;
    state.ctx.scale(dpr, dpr);

    // Store logical size
    CONFIG.CANVAS_WIDTH = rect.width;
    CONFIG.CANVAS_HEIGHT = rect.height;

    // Mouse Events for Threshold Dragging
    state.canvas.addEventListener('mousedown', handleMouseDown);
    state.canvas.addEventListener('mousemove', handleMouseMove);
    state.canvas.addEventListener('mouseup', handleMouseUp);
    state.canvas.addEventListener('mouseleave', handleMouseUp); // Stop dragging if leaves canvas

    // Touch Events
    state.canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    state.canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    state.canvas.addEventListener('touchend', handleMouseUp);
}

function initControls() {
    const threshSlider = document.getElementById('threshSlider');
    const overlapSlider = document.getElementById('overlapSlider');
    const sizeSlider = document.getElementById('sizeSlider');

    threshSlider.addEventListener('input', (e) => {
        state.threshold = parseInt(e.target.value);
        update();
    });

    overlapSlider.addEventListener('input', (e) => {
        state.overlap = parseInt(e.target.value);
        document.getElementById('overlapValue').textContent = getOverlapLabel(state.overlap);
        generateData(); // Overlap changes data distribution
        update();
    });

    sizeSlider.addEventListener('input', (e) => {
        state.sampleSize = parseInt(e.target.value);
        document.getElementById('sizeValue').textContent = state.sampleSize;
        generateData();
        update();
    });
}

// ===========================
// 數據生成 logic
// ===========================
function generateData() {
    state.data = [];
    const n = state.sampleSize / 2; // Split half positive, half negative roughly

    // Negative Class (Label 0): Mean centered at roughly 30% width
    // Positive Class (Label 1): Mean centered at roughly 70% width
    // Overlap affects how close the means are and their standard deviation

    // Map overlap 0-100 to distance. 
    // 0 overlap -> far apart means (e.g., 20 and 80)
    // 100 overlap -> same mean (e.g., 50 and 50)

    const centerMean = 50;
    const maxSpread = 30; // Max distance from center
    const spread = maxSpread * (1 - state.overlap / 100);

    const meanNeg = centerMean - spread;
    const meanPos = centerMean + spread;
    const stdDev = 10 + (state.overlap / 10); // More overlap = slightly wider spread

    // Generate Negative Samples (Label 0)
    for (let i = 0; i < n; i++) {
        const val = boxMullerRandom() * stdDev + meanNeg;
        const yOffset = boxMullerRandom() * 0.3; // 預先計算 Y 偏移量（正規化 0-1）
        state.data.push({ value: clamp(val, 0, 100), label: 0, yOffset: yOffset });
    }

    // Generate Positive Samples (Label 1)
    for (let i = 0; i < n; i++) {
        const val = boxMullerRandom() * stdDev + meanPos;
        const yOffset = boxMullerRandom() * 0.3; // 預先計算 Y 偏移量
        state.data.push({ value: clamp(val, 0, 100), label: 1, yOffset: yOffset });
    }
}

// 取得 Overlap 描述文字
function getOverlapLabel(value) {
    if (value <= 20) return '極低';
    if (value <= 40) return '低';
    if (value <= 60) return '中';
    if (value <= 80) return '高';
    return '極高';
}

// Gaussian Random Helper
function boxMullerRandom() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
}

// ===========================
// 核心更新 Logic
// ===========================
function update() {
    // 1. Update UI Labels
    document.getElementById('threshValue').textContent = (state.threshold / 100).toFixed(2);
    document.getElementById('threshSlider').value = state.threshold;

    // 2. Classify Data
    classifyData();

    // 3. Calculate Counts
    const counts = calculateConfusionMatrix();

    // 4. Update Matrix UI
    updateMatrixUI(counts);

    // 5. Update Metrics UI
    updateMetricsUI(counts);

    // 6. Render Canvas
    renderCanvas(counts);
}

function classifyData() {
    state.data.forEach(p => {
        // If value > threshold, predict Positive (1), else Negative (0)
        p.prediction = p.value >= state.threshold ? 1 : 0;
    });
}

function calculateConfusionMatrix() {
    let tp = 0, tn = 0, fp = 0, fn = 0;
    state.data.forEach(p => {
        if (p.label === 1 && p.prediction === 1) tp++;
        else if (p.label === 0 && p.prediction === 0) tn++;
        else if (p.label === 0 && p.prediction === 1) fp++;
        else if (p.label === 1 && p.prediction === 0) fn++;
    });
    return { tp, tn, fp, fn, total: state.data.length };
}

// ===========================
// UI 更新
// ===========================
function updateMatrixUI({ tp, tn, fp, fn }) {
    // 使用 requestAnimationFrame 讓數字跳動更順暢
    animateNumber('countTP', tp);
    animateNumber('countTN', tn);
    animateNumber('countFP', fp);
    animateNumber('countFN', fn);
}

function animateNumber(id, newValue) {
    const el = document.getElementById(id);
    const current = parseInt(el.textContent);
    if (current !== newValue) {
        el.textContent = newValue;
        // 簡單的閃爍效果
        el.style.transform = 'scale(1.2)';
        el.style.color = '#fff';
        setTimeout(() => {
            el.style.transform = 'scale(1)';
            el.style.color = '';
        }, 150);
    }
}

function updateMetricsUI({ tp, tn, fp, fn, total }) {
    // 避免分母為 0
    const accuracy = total > 0 ? (tp + tn) / total : 0;
    const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
    const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
    const f1 = (precision + recall) > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

    document.getElementById('valAcc').textContent = accuracy.toFixed(2);
    document.getElementById('valPrec').textContent = precision.toFixed(2);
    document.getElementById('valRec').textContent = recall.toFixed(2);
    document.getElementById('valF1').textContent = f1.toFixed(2);
}

// ===========================
// Render Canvas
// ===========================
function renderCanvas({ tp, tn, fp, fn }) {
    const { ctx, canvas } = state;
    const width = CONFIG.CANVAS_WIDTH;
    const height = CONFIG.CANVAS_HEIGHT;
    const PADDING = CONFIG.PADDING;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw Background Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(1, '#16213e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Draw Threshold Line
    const threshX = (state.threshold / 100) * width;

    // Highlight Regions
    // Left of threshold = Predicted Negative
    ctx.fillStyle = 'rgba(59, 130, 246, 0.05)'; // Blue tint
    ctx.fillRect(0, 0, threshX, height);

    // Right of threshold = Predicted Positive
    ctx.fillStyle = 'rgba(34, 197, 94, 0.05)'; // Green tint
    ctx.fillRect(threshX, 0, width - threshX, height);

    // Draw Points
    state.data.forEach(p => {
        const x = (p.value / 100) * width;
        // 使用預先儲存的 Y 偏移量，確保點不會每次重繪時跳動
        const yBase = height / 2;
        const yOffset = p.yOffset * (height / 2); // 將 yOffset 轉換為實際像素偏移
        const y = yBase + yOffset;

        ctx.beginPath();
        ctx.arc(x, y, CONFIG.POINT_RADIUS, 0, Math.PI * 2);

        // Determine Color based on Confusion Matrix Type
        if (p.label === 1 && p.prediction === 1) ctx.fillStyle = CONFIG.COLORS ? CONFIG.COLORS.tp : COLORS.positive; // TP
        else if (p.label === 0 && p.prediction === 0) ctx.fillStyle = CONFIG.COLORS ? CONFIG.COLORS.tn : COLORS.negative; // TN
        else if (p.label === 0 && p.prediction === 1) ctx.fillStyle = COLORS.fp; // FP (Red)
        else if (p.label === 1 && p.prediction === 0) ctx.fillStyle = COLORS.fn; // FN (Orange)

        // Or simpler: Color by Ground Truth, Highlight by Pred?
        // Let's stick to TP/TN/FP/FN colors defined in CSS variables mapping
        // Logic:
        // TP: Label 1, Pred 1 -> Green (Correct)
        // TN: Label 0, Pred 0 -> Blue (Correct)
        // FP: Label 0, Pred 1 -> Red (Error)
        // FN: Label 1, Pred 0 -> Orange (Error)

        if (p.label === 1) {
            if (p.prediction === 1) ctx.fillStyle = COLORS.positive; // TP (Green)
            else ctx.fillStyle = COLORS.fn; // FN (Amber/Orange)
        } else {
            if (p.prediction === 0) ctx.fillStyle = COLORS.negative; // TN (Blue)
            else ctx.fillStyle = COLORS.fp; // FP (Red)
        }

        ctx.fill();
    });

    // Draw Threshold Line (Foreground)
    ctx.beginPath();
    ctx.moveTo(threshX, 0);
    ctx.lineTo(threshX, height);
    ctx.strokeStyle = state.isDragging ? '#fff' : COLORS.threshold;
    ctx.lineWidth = state.isDragging ? 4 : 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Threshold Handle
    ctx.fillStyle = state.isDragging ? '#fff' : COLORS.threshold;
    ctx.beginPath();
    ctx.arc(threshX, height / 2, 6, 0, Math.PI * 2);
    ctx.fill();

    // Draw Text Labels
    ctx.font = '12px sans-serif';
    ctx.fillStyle = COLORS.axis;
    ctx.textAlign = 'center';

    // Predicted Negative Label
    ctx.fillText("Predicted Negative (0)", threshX / 2, 20);
    // Predicted Positive Label
    ctx.fillText("Predicted Positive (1)", threshX + (width - threshX) / 2, 20);

    // Threshold Value
    ctx.fillText(`Threshold: ${(state.threshold / 100).toFixed(2)}`, threshX, height - 10);
}

// ===========================
// Mouse Interaction
// ===========================
function handleMouseDown(e) {
    const mouseX = getMouseX(e);
    const width = CONFIG.CANVAS_WIDTH;
    const threshX = (state.threshold / 100) * width;

    // Check if clicking near threshold line (+- 20px)
    if (Math.abs(mouseX - threshX) < 20) {
        state.isDragging = true;
        state.canvas.style.cursor = 'grabbing';
    }
}

function handleMouseMove(e) {
    const mouseX = getMouseX(e);
    const width = CONFIG.CANVAS_WIDTH;

    if (state.isDragging) {
        let newThresh = (mouseX / width) * 100;
        newThresh = Math.max(0, Math.min(100, newThresh));
        state.threshold = newThresh;
        update();
    } else {
        // Hover effect cursor
        const threshX = (state.threshold / 100) * width;
        if (Math.abs(mouseX - threshX) < 20) {
            state.canvas.style.cursor = 'grab';
        } else {
            state.canvas.style.cursor = 'col-resize';
        }
    }
}

function handleMouseUp(e) {
    state.isDragging = false;
    state.canvas.style.cursor = 'col-resize';
}

function handleTouchStart(e) {
    e.preventDefault(); // Prevent scroll
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent("mousedown", {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    state.canvas.dispatchEvent(mouseEvent);
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent("mousemove", {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    state.canvas.dispatchEvent(mouseEvent);
}

function getMouseX(e) {
    const rect = state.canvas.getBoundingClientRect();
    return (e.clientX - rect.left) * (state.canvas.width / rect.width / window.devicePixelRatio); // Adjust for scale
}
