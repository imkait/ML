// 簡單的矩陣運算類別，用於解線性方程組 (Normal Equation)
class Matrix {
    constructor(rows, cols, data = []) {
        this.rows = rows;
        this.cols = cols;
        this.data = data.length ? data : new Array(rows * cols).fill(0);
    }

    get(row, col) {
        return this.data[row * this.cols + col];
    }

    set(row, col, value) {
        this.data[row * this.cols + col] = value;
    }

    multiply(other) {
        if (this.cols !== other.rows) throw new Error("Matrix dimensions do not match for multiplication.");
        const result = new Matrix(this.rows, other.cols);
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < other.cols; j++) {
                let sum = 0;
                for (let k = 0; k < this.cols; k++) {
                    sum += this.get(i, k) * other.get(k, j);
                }
                result.set(i, j, sum);
            }
        }
        return result;
    }

    transpose() {
        const result = new Matrix(this.cols, this.rows);
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                result.set(j, i, this.get(i, j));
            }
        }
        return result;
    }

    // 高斯消去法求逆 (僅適用於小矩陣，簡單實作)
    inverse() {
        if (this.rows !== this.cols) throw new Error("Matrix must be square to invert.");
        const n = this.rows;
        // 建立擴增矩陣 [A | I]
        const augmented = new Matrix(n, 2 * n);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) augmented.set(i, j, this.get(i, j));
            augmented.set(i, n + i, 1);
        }

        // 高斯消去
        for (let i = 0; i < n; i++) {
            let pivot = augmented.get(i, i);
            if (Math.abs(pivot) < 1e-10) continue; // 奇異矩陣或精度問題

            for (let j = 0; j < 2 * n; j++) {
                augmented.set(i, j, augmented.get(i, j) / pivot);
            }

            for (let k = 0; k < n; k++) {
                if (k !== i) {
                    const factor = augmented.get(k, i);
                    for (let j = 0; j < 2 * n; j++) {
                        augmented.set(k, j, augmented.get(k, j) - factor * augmented.get(i, j));
                    }
                }
            }
        }

        // 取出右半部
        const result = new Matrix(n, n);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                result.set(i, j, augmented.get(i, n + j));
            }
        }
        return result;
    }
}

// 全域變數
let chart;
let trainData = [];
let testData = [];
const trueFunc = (x) => 10 * Math.sin(x / 10) + 0.1 * (x - 20) ** 2 - 40; // 一個非線性的 ground truth

// 初始化 Chart.js
function initChart() {
    // 設定 Chart.js 全局預設顏色為亮色，以適應深色背景
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';

    const ctx = document.getElementById('chartCanvas').getContext('2d');
    chart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: '訓練資料 (Training)',
                    data: [],
                    backgroundColor: '#f43f5e', // Rose 500
                    pointRadius: 6,
                    pointHoverRadius: 8
                },
                {
                    label: '測試資料 (Testing)',
                    data: [],
                    backgroundColor: '#3b82f6', // Blue 500
                    pointRadius: 6,
                    pointHoverRadius: 8
                },
                {
                    label: '模型預測 (Prediction)',
                    data: [],
                    type: 'line',
                    borderColor: '#22c55e', // Green 500
                    borderWidth: 3,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: 0,
                    max: 60,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    title: { display: true, text: 'X (Feature)', color: '#cbd5e1' }
                },
                y: {
                    min: -60,
                    max: 60,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    title: { display: true, text: 'Y (Target)', color: '#cbd5e1' }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#e2e8f0', usePointStyle: true }
                },
                tooltip: { enabled: false }
            },
            animation: {
                duration: 400
            }
        }
    });
}

// 生成數據
function generateData() {
    const n = parseInt(document.getElementById('sampleSizeSlider').value);
    const noiseLevel = parseInt(document.getElementById('noiseSlider').value);

    trainData = [];
    testData = [];

    for (let i = 0; i < n; i++) {
        // 隨機分佈在 x = 5 到 55 之間
        const x = 5 + Math.random() * 50;
        const noise = (Math.random() - 0.5) * noiseLevel * 2;
        const y = trueFunc(x) + noise;
        trainData.push({ x, y });
    }

    // 生成測試數據 (數量固定，分佈更廣一點)
    for (let i = 0; i < 10; i++) {
        const x = 5 + Math.random() * 50;
        const noise = (Math.random() - 0.5) * noiseLevel * 2;
        const y = trueFunc(x) + noise;
        testData.push({ x, y });
    }

    updateChart();
}

// 計算多項式回歸
function solvePolynomialRegression(data, degree) {
    const m = data.length;
    if (m === 0) return [];

    const n = degree + 1; // 係數個數 (含常數項)

    // 建構 X 矩陣 (Vandermonde Matrix)
    const X = new Matrix(m, n);
    const Y = new Matrix(m, 1);

    // 正規化 X 以避免數值不穩定 (Feature Scaling)
    // 這裡簡單做：將 x 除以 60
    const scale = 60;

    for (let i = 0; i < m; i++) {
        const xVal = data[i].x / scale;
        Y.set(i, 0, data[i].y);
        for (let j = 0; j < n; j++) {
            X.set(i, j, Math.pow(xVal, j));
        }
    }

    // Normal Equation: w = (X^T * X)^-1 * X^T * Y
    try {
        const XT = X.transpose();
        const XTX = XT.multiply(X);

        // 加上一點點 Ridge Regularization (L2) 避免奇異矩陣，提升穩定性 (lambda * I)
        // 特別是在高階數且點很少時
        const lambda = 0.0001;
        for (let i = 0; i < n; i++) XTX.set(i, i, XTX.get(i, i) + lambda);

        const XTX_inv = XTX.inverse();
        const W = XTX_inv.multiply(XT).multiply(Y);

        return {
            predict: (x) => {
                let y_pred = 0;
                const x_scaled = x / scale;
                for (let j = 0; j < n; j++) {
                    y_pred += W.get(j, 0) * Math.pow(x_scaled, j);
                }
                return y_pred;
            },
            coefficients: W
        };
    } catch (e) {
        console.error("Matrix inversion failed", e);
        return null; // Should fall back or show error
    }
}

// 損失函數 (MSE)
function calculateMSE(model, data) {
    if (!model || data.length === 0) return 0;
    let sumError = 0;
    for (let p of data) {
        const pred = model.predict(p.x);
        sumError += (pred - p.y) ** 2;
    }
    return Math.sqrt(sumError / data.length).toFixed(2); // RMSE 比較直觀
}

// 處理概念卡片點擊模式
window.setPresetMode = function (mode) {
    const degreeSlider = document.getElementById('degreeSlider');
    let targetDegree;

    // 移除所有 active 樣式
    document.querySelectorAll('.concept-card').forEach(c => c.classList.remove('active'));

    switch (mode) {
        case 'underfit':
            targetDegree = 1;
            document.getElementById('cardUnderfit').classList.add('active');
            break;
        case 'optimal':
            targetDegree = 3;
            document.getElementById('cardOptimal').classList.add('active');
            break;
        case 'overfit':
            targetDegree = 15;
            document.getElementById('cardOverfit').classList.add('active');
            break;
    }

    if (targetDegree) {
        degreeSlider.value = targetDegree;
        updateChart();
    }
}

// 更新圖表與模型
function updateChart() {
    const degree = parseInt(document.getElementById('degreeSlider').value);

    // 更新 Active 狀態顯示
    document.querySelectorAll('.concept-card').forEach(c => c.classList.remove('active'));
    if (degree === 1) document.getElementById('cardUnderfit').classList.add('active');
    else if (degree >= 3 && degree <= 5) document.getElementById('cardOptimal').classList.add('active');
    else if (degree >= 12) document.getElementById('cardOverfit').classList.add('active');

    // 訓練模型
    const model = solvePolynomialRegression(trainData, degree);

    // 產生預測曲線的點
    const curveData = [];
    if (model) {
        for (let x = 0; x <= 60; x += 0.5) {
            curveData.push({ x: x, y: model.predict(x) });
        }
    }

    // 計算誤差
    const trainLoss = calculateMSE(model, trainData);
    const testLoss = calculateMSE(model, testData);

    // 更新 DOM
    document.getElementById('degreeValue').textContent = degree;
    document.getElementById('trainLossDisplay').textContent = trainLoss;
    document.getElementById('testLossDisplay').textContent = testLoss;

    // 視覺提示：如果 Test Loss 遠大於 Train Loss (且 Train Loss 很低)，提示過擬合
    // 這裡我們只改變文字顏色，保持介面簡潔
    const testLossElem = document.getElementById('testLossDisplay');
    if (degree > 10 && Number(testLoss) > Number(trainLoss) * 1.5) {
        testLossElem.style.color = '#f43f5e'; // Warning Red
        testLossElem.textContent += ' (High!)';
    } else {
        testLossElem.style.color = '#60a5fa'; // Normal Blue
    }

    // 更新 Chart.js 資料
    chart.data.datasets[0].data = trainData;
    chart.data.datasets[1].data = testData;
    chart.data.datasets[2].data = curveData;
    chart.update();
}

// 事件監聽
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    generateData();

    document.getElementById('degreeSlider').addEventListener('input', updateChart);
    document.getElementById('noiseSlider').addEventListener('input', (e) => {
        document.getElementById('noiseValue').textContent = e.target.value;
        generateData();
    });
    document.getElementById('sampleSizeSlider').addEventListener('input', (e) => {
        document.getElementById('sampleSizeValue').textContent = e.target.value;
        generateData();
    });
    document.getElementById('regenerateBtn').addEventListener('click', generateData);
});
