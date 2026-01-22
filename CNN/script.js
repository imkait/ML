const inputCanvas = document.getElementById('inputCanvas');
const outputCanvas = document.getElementById('outputCanvas');
const ctxInput = inputCanvas.getContext('2d');
const ctxOutput = outputCanvas.getContext('2d');
const kernelGrid = document.getElementById('kernelGrid');
const mathOutput = document.getElementById('mathOutput');

// Kernel 定義
const kernels = {
    edge: [
        [0, -1, 0],
        [-1, 4, -1],
        [0, -1, 0]
    ],
    sharpen: [
        [0, -1, 0],
        [-1, 5, -1],
        [0, -1, 0]
    ],
    boxBlur: [
        [1 / 9, 1 / 9, 1 / 9],
        [1 / 9, 1 / 9, 1 / 9],
        [1 / 9, 1 / 9, 1 / 9]
    ],
    emboss: [
        [-2, -1, 0],
        [-1, 1, 1],
        [0, 1, 2]
    ],
    identity: [
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0]
    ]
};

let currentKernel = kernels.edge;
let originImageData = null;
const imageSize = 300; // 畫布大小

// 初始化
// 初始化
function init() {
    // 改為程式碼繪製圖案，避免本地 file:// 協議的 CORS 跨域問題導致 getImageData 失敗
    drawSamplePattern();

    // 取得影像數據
    originImageData = ctxInput.getImageData(0, 0, imageSize, imageSize);
    applyConvolution();

    // 處理濾鏡按鈕點擊
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // 更新按鈕狀態
            document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            // 切換 Kernel
            const key = e.target.dataset.filter;
            currentKernel = kernels[key];
            updateKernelGridDisplay();
            applyConvolution();
        });
    });

    // 滑鼠互動事件
    inputCanvas.addEventListener('mousemove', handleMouseMove);
    inputCanvas.addEventListener('mouseleave', () => {
        // 重繪原圖清除高亮框
        if (originImageData) {
            ctxInput.putImageData(originImageData, 0, 0);
        }
        mathOutput.innerHTML = '請將滑鼠移至左側圖片上...';
    });
}

// 繪製範例圖案 (機器人臉)，確保有清楚的邊緣
function drawSamplePattern() {
    const w = imageSize;
    const h = imageSize;

    // 背景：白色
    ctxInput.fillStyle = '#ffffff';
    ctxInput.fillRect(0, 0, w, h);

    // 機器人頭：黑色正方形
    ctxInput.fillStyle = '#000000';
    ctxInput.fillRect(50, 50, 200, 200);

    // 眼睛：白色
    ctxInput.fillStyle = '#ffffff';
    ctxInput.fillRect(80, 100, 40, 40); // 左眼
    ctxInput.fillRect(180, 100, 40, 40); // 右眼

    // 嘴巴：白色長條
    ctxInput.fillRect(80, 180, 140, 30);

    // 牙齒：黑色線條
    ctxInput.fillStyle = '#000000';
    for (let i = 1; i < 5; i++) {
        ctxInput.fillRect(80 + i * 28, 180, 5, 30);
    }

    // 天線
    ctxInput.lineWidth = 8;
    ctxInput.beginPath();
    ctxInput.moveTo(150, 50);
    ctxInput.lineTo(150, 20);
    ctxInput.stroke();

    // 天線球
    ctxInput.beginPath();
    ctxInput.arc(150, 15, 8, 0, Math.PI * 2);
    ctxInput.fill();
}

// 更新 Kernel 網格顯示
function updateKernelGridDisplay() {
    kernelGrid.innerHTML = '';
    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
            const cell = document.createElement('div');
            cell.className = 'kernel-cell';
            // 處理浮點數顯示
            let val = currentKernel[y][x];
            cell.textContent = Number.isInteger(val) ? val : val.toFixed(2);
            kernelGrid.appendChild(cell);
        }
    }
}

// 應用卷積運算
function applyConvolution() {
    if (!originImageData) return;

    const w = imageSize;
    const h = imageSize;
    const inputData = originImageData.data;
    const outputImage = ctxOutput.createImageData(w, h);
    const outputData = outputImage.data;

    // 對每個像素進行卷積 (忽略邊界)
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            let r = 0, g = 0, b = 0;

            // 3x3 卷積運算
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const inputIdx = ((y + ky) * w + (x + kx)) * 4;
                    const weight = currentKernel[ky + 1][kx + 1];

                    r += inputData[inputIdx] * weight;
                    g += inputData[inputIdx + 1] * weight;
                    b += inputData[inputIdx + 2] * weight;
                }
            }

            const outputIdx = (y * w + x) * 4;
            outputData[outputIdx] = r;
            outputData[outputIdx + 1] = g;
            outputData[outputIdx + 2] = b;
            outputData[outputIdx + 3] = 255; // Alpha
        }
    }

    ctxOutput.putImageData(outputImage, 0, 0);
}

// 處理滑鼠移動：顯示各別運算細節
function handleMouseMove(e) {
    if (!originImageData) return;

    const rect = inputCanvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (inputCanvas.width / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (inputCanvas.height / rect.height));

    // 邊界檢查
    if (x < 1 || x >= imageSize - 1 || y < 1 || y >= imageSize - 1) return;

    // 1. 重繪原圖並繪製紅色框框
    ctxInput.putImageData(originImageData, 0, 0);
    ctxInput.strokeStyle = 'red';
    ctxInput.lineWidth = 1;
    ctxInput.strokeRect(x - 1, y - 1, 3, 3); // 框住 3x3 區域 (這裡因為像素太小可能看不清，實際應用可能需要放大顯示)

    // 為了視覺效果，我們畫一個明顯一點的框 (10x10)，但計算是指向中間像素
    // 修正：因為是像素級操作，如果圖片很大，3x3 很小。
    // 但此處為了教學，我們顯示局部放大的數值計算

    // 2. 顯示計算過程
    showCalculationDetails(x, y);
}

function showCalculationDetails(cx, cy) {
    let html = `<strong>中心像素 (${cx}, ${cy}) 的運算：</strong><br><br>`;

    // 取出 3x3 區域的 RGB 平均值 (簡化顯示)
    const inputData = originImageData.data;
    const w = imageSize;

    let formula = '';
    let totalVal = 0;

    // 為了簡單，我們只展示紅色通道 (R) 的運算
    html += '<span style="color: #666; font-size: 0.8rem;">(以 R 色板為例)</span><br>';

    html += '<div style="font-family: monospace; white-space: pre-wrap;">';

    for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
            const idx = ((cy + ky) * w + (cx + kx)) * 4;
            const pixelVal = inputData[idx]; // R value
            const weight = currentKernel[ky + 1][kx + 1];

            // 格式化顯示
            const weightStr = Number.isInteger(weight) ? weight : weight.toFixed(2);

            if (weight !== 0) {
                const sign = (pixelVal * weight) >= 0 ? '+' : '';
                const term = `(${pixelVal} × ${weightStr})`;
                formula += formula === '' ? term : ` ${sign} ${term}`;
                totalVal += pixelVal * weight;
            }
        }
    }
    html += formula + ` = <strong>${Math.round(totalVal)}</strong>`;
    html += '</div>';

    mathOutput.innerHTML = html;
}

// 啟動
init();
updateKernelGridDisplay();
