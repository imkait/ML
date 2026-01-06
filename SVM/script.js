/**
 * SVM 支援向量機互動教學 - JavaScript 邏輯
 * 包含簡化的 SMO 演算法與可視化
 */

// ===========================
// 全域設定與狀態
// ===========================
const CONFIG = {
    CANVAS_WIDTH: 600,
    CANVAS_HEIGHT: 400,
    POINT_RADIUS: 6,
    GRID_RESOLUTION: 2, // 繪製決策邊界的網格精細度 (越小越細但越慢)
};

// 顏色與樣式
const STYLES = {
    classA: '#f43f5e', // +1
    classB: '#06b6d4', // -1
    boundaryColor: '#ffffff',
    marginColor: 'rgba(255, 255, 255, 0.4)',
    svHighlight: '#fbbf24',
};

// SVM 參數與狀態
let state = {
    kernel: 'linear', // 'linear' or 'rbf'
    C: 1.0,           // Regularization parameter
    data: [],         // Array of {x, y, label} (label: 1 or -1)
    alphas: [],       // Lagrange multipliers
    b: 0,             // Bias
    isTrained: false,

    // Canvas context
    canvas: null,
    ctx: null,
};

// ===========================
// 初始化與 DOM 事件
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    initControls();
    generateRandomData('linear'); // 預設生成線性可分資料
    render();
});

function initCanvas() {
    state.canvas = document.getElementById('svmCanvas');
    state.ctx = state.canvas.getContext('2d');

    const dpr = window.devicePixelRatio || 1;
    const rect = state.canvas.getBoundingClientRect();
    state.canvas.width = rect.width * dpr;
    state.canvas.height = rect.height * dpr;
    state.ctx.scale(dpr, dpr);

    CONFIG.CANVAS_WIDTH = rect.width;
    CONFIG.CANVAS_HEIGHT = rect.height;

    state.canvas.style.width = rect.width + 'px';
    state.canvas.style.height = rect.height + 'px';
}

function initControls() {
    const kernelSelect = document.getElementById('kernelSelect');
    const cSlider = document.getElementById('cSlider');
    const cValue = document.getElementById('cValue');
    const trainBtn = document.getElementById('trainBtn');
    const randomBtn = document.getElementById('randomBtn');
    const resetBtn = document.getElementById('resetBtn');

    kernelSelect.addEventListener('change', (e) => {
        state.kernel = e.target.value;
        // 切換 kernel 時，建議重新生成適合的資料
        generateRandomData(state.kernel);
        state.isTrained = false;
        updateStatus('等待訓練');
        render();
    });

    cSlider.addEventListener('input', (e) => {
        state.C = parseFloat(e.target.value);
        cValue.textContent = state.C;
        // C 值改變不自動重訓，等待用戶點擊
        state.isTrained = false;
        updateStatus('參數已變更 (請重新訓練)');
    });

    trainBtn.addEventListener('click', () => {
        console.log('Train button clicked');
        trainSVM();
    });

    randomBtn.addEventListener('click', () => {
        console.log('Random button clicked');
        generateRandomData(state.kernel);
        state.isTrained = false;
        updateStatus('等待訓練');
        render();
    });

    resetBtn.addEventListener('click', () => {
        state.data = [];
        state.alphas = [];
        state.b = 0;
        state.isTrained = false;
        updateStatus('已重置');
        render();
    });
}

// ===========================
// 資料生成
// ===========================
function generateRandomData(type) {
    state.data = [];

    if (type === 'linear') {
        // 生成線性可分資料 (兩群分開)
        // Group A (+1): 左上
        for (let i = 0; i < 20; i++) {
            state.data.push({
                x: Math.random() * (CONFIG.CANVAS_WIDTH * 0.4) + 50,
                y: Math.random() * (CONFIG.CANVAS_HEIGHT * 0.5) + 50,
                label: 1
            });
        }
        // Group B (-1): 右下
        for (let i = 0; i < 20; i++) {
            state.data.push({
                x: Math.random() * (CONFIG.CANVAS_WIDTH * 0.4) + CONFIG.CANVAS_WIDTH * 0.5,
                y: Math.random() * (CONFIG.CANVAS_HEIGHT * 0.5) + CONFIG.CANVAS_HEIGHT * 0.4,
                label: -1
            });
        }
    } else {
        // 生成非線性資料 (同心圓/環狀)
        // Group A (+1): 中心
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * 50;
            state.data.push({
                x: centerX + r * Math.cos(angle),
                y: centerY + r * Math.sin(angle),
                label: 1
            });
        }
        // Group B (-1): 外環
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * 60 + 90; // 半徑 90-150
            state.data.push({
                x: centerX + r * Math.cos(angle),
                y: centerY + r * Math.sin(angle),
                label: -1
            });
        }
    }
}

// ===========================
// SVM 核心演算法 (Simplified SMO)
// ===========================

// Kernel Functions
function kernel(v1, v2) {
    // 使用最大邊長進行歸一化，以保持長寬比 (Aspect Ratio)
    // 避免圖形被拉伸變形
    const scale = Math.max(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    if (state.kernel === 'linear') {
        const dx = (v1.x / scale);
        const dy = (v1.y / scale);
        const dx2 = (v2.x / scale);
        const dy2 = (v2.y / scale);
        return dx * dx2 + dy * dy2;
    } else {
        // RBF Kernel: exp(-gamma * ||x1 - x2||^2)
        const dx = (v1.x - v2.x) / scale;
        const dy = (v1.y - v2.y) / scale;
        const distSq = dx * dx + dy * dy;
        const gamma = 10.0;
        return Math.exp(-gamma * distSq);
    }
}

// Decision Function: f(x) = sum(alpha_i * y_i * K(x_i, x)) + b
function decisionFunction(point) {
    let sum = 0;
    for (let i = 0; i < state.data.length; i++) {
        if (state.alphas[i] > 0) {
            sum += state.alphas[i] * state.data[i].label * kernel(state.data[i], point);
        }
    }
    return sum + state.b;
}

function trainSVM() {
    updateStatus('訓練中...');

    // 簡單的 SMO 實現 (簡化版，非完整 Platt SMO)
    // 初始化
    const N = state.data.length;
    state.alphas = new Float64Array(N).fill(0);
    state.b = 0;

    const maxPasses = 10;
    let passes = 0;
    const tol = 1e-4; // Tolerance
    const C = state.C; // Regularization

    // 為了不阻塞 UI，使用 setTimeout
    setTimeout(() => {
        try {
            console.log('Training started...');
            let iter = 0;
            const maxIter = 2000;

            while (passes < maxPasses && iter < maxIter) {
                let numChangedAlphas = 0;
                for (let i = 0; i < N; i++) {
                    const E_i = decisionFunction(state.data[i]) - state.data[i].label;

                    if ((state.data[i].label * E_i < -tol && state.alphas[i] < C) ||
                        (state.data[i].label * E_i > tol && state.alphas[i] > 0)) {

                        // Select j randomly distinct from i
                        let j = Math.floor(Math.random() * (N - 1));
                        if (j >= i) j++;

                        const E_j = decisionFunction(state.data[j]) - state.data[j].label;

                        // Save old alphas
                        const alpha_i_old = state.alphas[i];
                        const alpha_j_old = state.alphas[j];

                        // Compute L and H
                        let L, H;
                        if (state.data[i].label !== state.data[j].label) {
                            L = Math.max(0, state.alphas[j] - state.alphas[i]);
                            H = Math.min(C, C + state.alphas[j] - state.alphas[i]);
                        } else {
                            L = Math.max(0, state.alphas[i] + state.alphas[j] - C);
                            H = Math.min(C, state.alphas[i] + state.alphas[j]);
                        }

                        if (L === H) continue;

                        // Compute eta
                        const eta = 2 * kernel(state.data[i], state.data[j]) -
                            kernel(state.data[i], state.data[i]) -
                            kernel(state.data[j], state.data[j]);

                        if (eta >= 0) continue;

                        // Update alpha_j
                        state.alphas[j] -= (state.data[j].label * (E_i - E_j)) / eta;
                        state.alphas[j] = Math.min(H, Math.max(L, state.alphas[j]));

                        if (Math.abs(state.alphas[j] - alpha_j_old) < 1e-5) continue;

                        // Update alpha_i
                        state.alphas[i] += state.data[i].label * state.data[j].label * (alpha_j_old - state.alphas[j]);

                        // Update b
                        const b1 = state.b - E_i -
                            state.data[i].label * (state.alphas[i] - alpha_i_old) * kernel(state.data[i], state.data[i]) -
                            state.data[j].label * (state.alphas[j] - alpha_j_old) * kernel(state.data[i], state.data[j]);

                        const b2 = state.b - E_j -
                            state.data[i].label * (state.alphas[i] - alpha_i_old) * kernel(state.data[i], state.data[j]) -
                            state.data[j].label * (state.alphas[j] - alpha_j_old) * kernel(state.data[j], state.data[j]);

                        if (0 < state.alphas[i] && state.alphas[i] < C) state.b = b1;
                        else if (0 < state.alphas[j] && state.alphas[j] < C) state.b = b2;
                        else state.b = (b1 + b2) / 2;

                        numChangedAlphas++;
                    }
                }

                if (numChangedAlphas === 0) passes++;
                else passes = 0;
                iter++;
            }

            console.log('Training finished. Iter:', iter);
            state.isTrained = true;
            updateStatus('訓練完成');
            countSupportVectors();
            render();
        } catch (error) {
            console.error('Training error:', error);
            alert('訓練發生錯誤: ' + error.message);
            updateStatus('訓練失敗');
        }

    }, 10);
}

// ===========================
// 輔助與 UI
// ===========================

function updateStatus(text) {
    document.getElementById('trainStatus').textContent = text;
}

function countSupportVectors() {
    let count = 0;
    const threshold = 1e-4; // threshold for alpha > 0
    state.alphas.forEach(a => {
        if (a > threshold) count++;
    });
    document.getElementById('svCount').textContent = count;
}

// ===========================
// 渲染
// ===========================

function render() {
    state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height); // Clear physical size

    // 如果已訓練，繪製決策邊界與背景
    if (state.isTrained) {
        drawDecisionBoundary();
    }

    // 繪製資料點 (需要縮放 context，所以這裡的變換會影響 drawPoints 嗎？)
    // 注意: initCanvas 裡已經做了 scale，但 putImageData 會忽略 scale。
    // 我們在 drawDecisionBoundary 使用了 putImageData，這會覆蓋整個 buffer。
    // 所以 drawPoints 繼續使用原本的邏輯座標即可，因為 ctx.state 還是 scaled 的。
    // 唯一的問題是 putImageData 不受 scale 影響，它是直接寫入像素。

    drawPoints();
}

function drawDecisionBoundary() {
    // 獲取整個 Canvas (物理像素) 的 ImageData
    const width = state.canvas.width;
    const height = state.canvas.height;
    const imageData = state.ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const dpr = window.devicePixelRatio || 1;
    const res = Math.floor(CONFIG.GRID_RESOLUTION * dpr); // 根據 DPR 調整網格大小

    // 對每個像素區塊進行分類預測
    for (let x = 0; x < width; x += res) {
        for (let y = 0; y < height; y += res) {
            // 將物理座標轉換回邏輯座標進行預測
            const logicalX = (x + res / 2) / dpr;
            const logicalY = (y + res / 2) / dpr;

            const val = decisionFunction({ x: logicalX, y: logicalY });

            // 決定顏色
            let r, g, b, a;

            // 1. 背景底色 (根據預測值決定紅/藍區域)
            if (val > 0) {
                // Class A (+1) red
                r = 244; g = 63; b = 94;
                // 減少不透明度，讓線條更明顯
                a = 0.1 + Math.min(Math.abs(val), 1) * 0.05;
            } else {
                // Class B (-1) cyan
                r = 6; g = 182; b = 212;
                a = 0.1 + Math.min(Math.abs(val), 1) * 0.05;
            }

            // 2. 線條繪製
            // 閾值決定線條粗細
            const lineThreshold = 0.15;

            if (Math.abs(val) < lineThreshold) {
                // === 實線 (決策邊界) ===
                r = 255; g = 255; b = 255; a = 0.9;
            } else if (Math.abs(Math.abs(val) - 1) < lineThreshold) {
                // === 虛線 (邊距 Margin) ===
                // 使用座標來模擬虛線效果: (x + y) 的週期性變化
                // 每個 block 是 8px，設週期為 32px (4 blocks) - 需隨DPR調整
                const dashPeriod = 32 * dpr;
                const isDash = ((x + y) % dashPeriod) < (dashPeriod / 2);

                if (isDash) {
                    r = 255; g = 255; b = 255; a = 0.6;
                }
                // 如果是空隙，就保留背景色
            }

            // 填充區塊
            for (let dx = 0; dx < res; dx++) {
                for (let dy = 0; dy < res; dy++) {
                    if (x + dx < width && y + dy < height) {
                        const index = ((y + dy) * width + (x + dx)) * 4;
                        data[index] = r;
                        data[index + 1] = g;
                        data[index + 2] = b;
                        data[index + 3] = a * 255;
                    }
                }
            }
        }
    }
    state.ctx.putImageData(imageData, 0, 0);
}

function drawPoints() {
    state.data.forEach((p, i) => {
        // 檢查是否為支持向量
        const isSV = state.isTrained && state.alphas[i] > 1e-4;

        if (isSV) {
            // Draw highlight halo
            state.ctx.beginPath();
            state.ctx.arc(p.x, p.y, CONFIG.POINT_RADIUS + 6, 0, Math.PI * 2);
            state.ctx.strokeStyle = STYLES.svHighlight;
            state.ctx.lineWidth = 2;
            state.ctx.stroke();

            state.ctx.fillStyle = 'rgba(251, 191, 36, 0.2)';
            state.ctx.fill();
        }

        state.ctx.beginPath();
        state.ctx.arc(p.x, p.y, CONFIG.POINT_RADIUS, 0, Math.PI * 2);
        state.ctx.fillStyle = p.label === 1 ? STYLES.classA : STYLES.classB;
        state.ctx.fill();

        // 邊框
        state.ctx.strokeStyle = '#fff';
        state.ctx.lineWidth = 1.5;
        state.ctx.stroke();
    });
}
