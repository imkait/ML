
// ===========================
// 全域狀態 (State Management)
// ===========================
const state = {
    // 數據相關
    points: [],
    trueFunc: null, // 真實函數 (如 sin(x) 等) 
    
    // 模型參數
    degree: 10,
    weights: [], // w0, w1, ... wn
    
    // 訓練相關
    isTraining: false,
    learningRate: 0.01,
    lambda: 0, // 正規化強度
    regType: 'none', // 'none', 'l1', 'l2'
    
    // 狀態計數
    epoch: 0,
    animationId: null,
    
    // 數據生成設定
    numPoints: 15,
    noiseLevel: 20,
    
    // Canvas & Chart Objects
    mainChart: null,
    weightsChart: null
};

// ===========================
// 初始化 (Initialization)
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    initControls();
    resetData(); // 初始化數據與模型
});

function initCharts() {
    // 1. 主圖表 (回歸曲線)
    const ctxMain = document.getElementById('mainCanvas').getContext('2d');
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
    
    state.mainChart = new Chart(ctxMain, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: '訓練數據 (Points)',
                    data: [],
                    backgroundColor: '#f59e0b', // Amber
                    pointRadius: 6,
                    pointHoverRadius: 8
                },
                {
                    label: '預測模型 (Prediction)',
                    data: [],
                    type: 'line',
                    borderColor: '#8b5cf6', // Violet
                    borderWidth: 3,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.4
                },
                {
                    label: '真實函數 (Ground Truth)',
                    data: [],
                    type: 'line',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                    tension: 0.4,
                    hidden: true // 預設隱藏，避免混淆
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 }, // 訓練時自己控制重繪，關閉 Chart.js 動畫
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: 0,
                    max: 1,
                    title: { display: true, text: 'X (Feature)' }
                },
                y: {
                    min: -2,
                    max: 2,
                    title: { display: true, text: 'Y (Target)' }
                }
            },
            plugins: {
                legend: { position: 'top' },
                tooltip: { enabled: false }
            }
        }
    });
    
    // 2. 權重圖表 (Bar Chart)
    const ctxWeights = document.getElementById('weightsCanvas').getContext('2d');
    state.weightsChart = new Chart(ctxWeights, {
        type: 'bar',
        data: {
            labels: [], // w0, w1...
            datasets: [{
                label: 'Weights Magnitude',
                data: [],
                backgroundColor: [], // 動態顏色
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 200 },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

function initControls() {
    // Sliders
    bindSlider('degreeSlider', 'degreeVal', val => {
        state.degree = parseInt(val);
        resetModel(); // 改變 degree 需重設模型
    });
    
    bindSlider('pointsSlider', 'pointsVal', val => {
        state.numPoints = parseInt(val);
        resetData();
    });
    
    bindSlider('noiseSlider', 'noiseVal', val => {
        state.noiseLevel = parseInt(val);
        resetData();
    });
    
    bindSlider('lambdaSlider', 'lambdaVal', val => {
        // 使用指數量級，讓調整範圍更廣 (0 ~ 100 -> 0.000 ~ 1.0)
        // 為了教學直觀，我們直接線性對應 0~0.1 可能更簡單
        // 這裡設定: val / 1000 * 5 (range 0 to 0.5) roughly
        // 或者是直接 val / 1000
        const lambda = val / 200; // 0 ~ 0.5
        state.lambda = lambda;
        document.getElementById('lambdaVal').textContent = lambda.toFixed(3);
        updateRegHint();
    });
    
    bindSlider('lrSlider', 'lrVal', val => {
        state.learningRate = parseFloat(val);
    });
    
    // Radio Buttons
    document.querySelectorAll('input[name="regType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.regType = e.target.value;
            state.mainChart.data.datasets[1].borderColor = getThemeColor();
            state.mainChart.update();
            updateRegHint();
        });
    });
    
    // Buttons
    document.getElementById('resetDataBtn').addEventListener('click', resetData);
    document.getElementById('resetModelBtn').addEventListener('click', resetModel);
    
    const trainBtn = document.getElementById('trainBtn');
    trainBtn.addEventListener('click', () => {
        if(state.isTraining) stopTraining();
        else startTraining();
    });
}

function bindSlider(id, displayId, callback) {
    const slider = document.getElementById(id);
    const display = document.getElementById(displayId);
    slider.addEventListener('input', (e) => {
        display.textContent = e.target.value;
        callback(e.target.value);
    });
}

function getThemeColor() {
    if (state.regType === 'l1') return '#ec4899'; // Pink
    if (state.regType === 'l2') return '#8b5cf6'; // Violet
    return '#8b5cf6'; // Default
}

function updateRegHint() {
    const hint = document.getElementById('regHint');
    const type = state.regType;
    const lam = state.lambda;
    
    if (type === 'none') {
        hint.textContent = "未啟用正規化。模型會盡力擬合每一個數據點。";
    } else if (lam === 0) {
        hint.textContent = `已選擇 ${type.toUpperCase()}，但強度為 0 (效果同 None)。`;
    } else if (type === 'l1') {
        hint.textContent = `L1 (Lasso) 正將不重要的權重壓縮至 0，稀疏化模型。`;
    } else {
        hint.textContent = `L2 (Ridge) 正同時壓抑所有權重大小，使曲線平滑。`;
    }
}

// ===========================
// 資料與模型邏輯
// ===========================

function resetData() {
    stopTraining();
    state.points = [];
    
    // 真實函數 (Ground Truth): 一個平滑的曲線
    // y = 0.5 * sin(2 * PI * x) + 0.1
    state.trueFunc = (x) => 0.8 * Math.sin(3 * Math.PI * x) + Math.cos(5 * x)*0.2;
    
    // 生成數據
    for(let i=0; i<state.numPoints; i++) {
        // x 分佈: 0.1 ~ 0.9 避免邊界極端值
        const x = 0.05 + Math.random() * 0.9; 
        
        let y = state.trueFunc(x);
        
        // 加入雜訊
        const noise = (Math.random() - 0.5) * (state.noiseLevel / 100); 
        y += noise;
        
        state.points.push({x, y});
    }
    
    resetModel();
}

function resetModel() {
    state.epoch = 0;
    
    // 初始化權重 (隨機小數)
    // weights[i] corresponds to x^i
    state.weights = new Array(state.degree + 1).fill(0).map(() => (Math.random() - 0.5) * 0.1);
    
    // 如果想要更容易觀察 Lasso 效果，可以把初始權重設大一點點
    // state.weights = new Array(state.degree + 1).fill(0).map(() => (Math.random() * 2 - 1));

    updateLoop(false); // 更新一次畫面
}

function predict(x) {
    let y = 0;
    for(let i=0; i < state.weights.length; i++) {
        // Feature Scaling: x^i
        // 由於我們 x 在 0~1 之間，x^10 會變得很小，導致高階權重需要很大才能起作用
        // 這在數值上會有問題 (Gradient Exploding/Vanishing)。
        // 簡單解法：這裡不做特別正規化，依賴數據範圍 0-1 對多項式回歸尚可接受。
        // 但為了讓 Regularization 效果在不同 degree 下均勻，通常建議對 feature 做 scaling。
        // 為簡化教學程式碼，暫不引入複雜 scaling。
        y += state.weights[i] * Math.pow(x, i);
    }
    return y;
}

// ===========================
// 訓練迴圈 (Gradient Descent)
// ===========================

function startTraining() {
    state.isTraining = true;
    document.getElementById('trainBtn').textContent = '⏸ 暫停訓練';
    document.getElementById('trainBtn').classList.add('active');
    
    trainLoop();
}

function stopTraining() {
    state.isTraining = false;
    document.getElementById('trainBtn').textContent = '▶ 繼續訓練';
    document.getElementById('trainBtn').classList.remove('active');
    
    if (state.animationId) cancelAnimationFrame(state.animationId);
}

function trainLoop() {
    if (!state.isTraining) return;
    
    // 每個 Frame 跑多次更新，加快訓練視覺速度
    const stepsPerFrame = 10; 
    
    for(let k=0; k<stepsPerFrame; k++) {
        gdStep();
        state.epoch++;
    }
    
    updateLoop(true);
    state.animationId = requestAnimationFrame(trainLoop);
}

function gdStep() {
    const N = state.points.length;
    const w = state.weights;
    const lr = state.learningRate;
    const lambda = state.lambda;
    const type = state.regType;
    
    // 計算梯度
    let gradients = new Array(w.length).fill(0);
    let mseLoss = 0;
    
    // 1. MSE Gradient
    // d(MSE)/dw = (2/N) * sum( (y_pred - y) * x^i )
    for(let p of state.points) {
        const y_pred = predict(p.x);
        const error = y_pred - p.y;
        mseLoss += error * error;
        
        for(let i=0; i<w.length; i++) {
            gradients[i] += (2/N) * error * Math.pow(p.x, i);
        }
    }
    mseLoss /= N;
    
    // 2. 更新權重 (包含 Regularization)
    for(let i=0; i<w.length; i++) {
        // 更新基礎梯度
        let newW = w[i] - lr * gradients[i];
        
        // 我們通常不對 Bias (w0) 進行正規化
        if (i === 0) {
            w[i] = newW;
            continue;
        }
        
        // 應用正規化
        if (type === 'l2') {
            // L2 Ridge: Penalty = lambda * w^2
            // Gradient = 2 * lambda * w
            // Update: w = w - lr * (grad + 2*lambda*w)
            //         = w(1 - 2*lr*lambda) - lr*grad
            // 這是 Weight Decay 的形式
            
            // 注意：這裡 lambda 係數 scaling 調整一下以免 demo 效果太強/太弱
            // 通常 formulation 是 loss + lambda * norm
            
            // w[i] = newW - lr * (2 * lambda * w[i]); 
            // 由於我們是 incremental update, 用 newW 對嗎？通常用 old w。
            // 嚴謹寫法：
            const l2_grad = 2 * lambda * w[i];
            w[i] = w[i] - lr * (gradients[i] + l2_grad);
            
        } else if (type === 'l1') {
            // L1 Lasso: Penalty = lambda * |w|
            // Proximal Gradient Descent (ISTA) Implementation for better sparsity
            // Step 1: Standard GD step (already computed 'newW' above based on MSE gradient)
            // Step 2: Soft Thresholding
            // S(w, alpha) = sign(w) * max(0, |w| - alpha)
            // alpha = lr * lambda
            
            const alpha = lr * lambda;
            const sign = Math.sign(newW);
            const mag = Math.abs(newW);
            
            // Soft thresholding
            w[i] = sign * Math.max(0, mag - alpha);
            
            // Simple Subgradient method (alternative):
            // const l1_grad = lambda * Math.sign(w[i]);
            // w[i] = w[i] - lr * (gradients[i] + l1_grad);
            // ISTA (Soft Thresholding) is usually better for achieving exact zeros.
        } else {
            // None
            w[i] = newW;
        }
    }
}

// ===========================
// 視覺更新
// ===========================

function updateLoop(isAnimating) {
    // 1. 計算並顯示 Loss
    // 注意：顯示的 Loss 通常還是 MSE，方便比較擬合程度
    let mse = 0;
    for(let p of state.points) {
        const err = predict(p.x) - p.y;
        mse += err * err;
    }
    mse /= state.points.length;
    
    document.getElementById('lossDisplay').textContent = mse.toFixed(4);
    document.getElementById('epochDisplay').textContent = state.epoch;
    
    // 2. 更新主圖表
    // 產生曲線點
    const curvePoints = [];
    for(let x=0; x<=1; x+=0.02) {
        curvePoints.push({x: x, y: predict(x)});
    }
    
    // 真實函數點 (只生成一次即可，但這裡簡單處理)
    const truthPoints = [];
     for(let x=0; x<=1; x+=0.02) {
        truthPoints.push({x: x, y: state.trueFunc(x)});
    }
    
    if (state.mainChart) {
        state.mainChart.data.datasets[0].data = state.points;
        state.mainChart.data.datasets[1].data = curvePoints;
        state.mainChart.data.datasets[2].data = truthPoints;
        state.mainChart.update('none'); // 'none' mode for performance
    }
    
    // 3. 更新權重圖表
    if (state.weightsChart) {
        const labels = state.weights.map((_, i) => i === 0 ? 'Bias' : `x${i}`);
        const data = state.weights.map(w => w); // View raw values
        const colors = state.weights.map(w => {
            if (Math.abs(w) < 0.001) return '#334155'; // Zero (Slate 700)
            return w >= 0 ? '#3b82f6' : '#ef4444'; // Blue pos, Red neg
        });
        
        state.weightsChart.data.labels = labels;
        state.weightsChart.data.datasets[0].data = data;
        state.weightsChart.data.datasets[0].backgroundColor = colors;
        state.weightsChart.update('none');
    }
}
