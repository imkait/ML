const inputCanvas = document.getElementById('inputCanvas');
const outputCanvas = document.getElementById('outputCanvas');
const ctxInput = inputCanvas.getContext('2d');
const ctxOutput = outputCanvas.getContext('2d');
const mathOutput = document.getElementById('mathOutput');
const poolResultDisplay = document.getElementById('poolResultDisplay');
const poolingWindowDiv = document.getElementById('poolingWindow');

// 參數設定
// 參數設定
let currentMode = 'max'; // 'max' or 'mean'
const gridSize = 20;     // 20x20
const poolSize = 2;      // 2x2 window
const stride = 2;        // Stride 2
const outputGridSize = gridSize / stride; // 10x10

// 顯示參數
const cellSizeInput = 20; // 輸入畫布格子大小 20px -> 20*20 = 400
const cellSizeOutput = 20; // 輸出畫布格子大小 20px -> 10*20 = 200 (保持像素大小一致，視覺上變小)
// 註：inputCanvas width=400, outputCanvas width=200

// 數據
let originImageData = null;
let outputData = null;

// 初始化
function init() {
    // 繪製像素網格圖案 (20x20)
    createImageData();
    drawInputGrid();
    applyPooling();

    // 綁定事件
    bindEvents();
}

// 產生模擬圖像數據 (20x20) - 數字 5
function createImageData() {
    const data = [];
    for (let y = 0; y < gridSize; y++) {
        data[y] = [];
        for (let x = 0; x < gridSize; x++) {
            // 背景雜訊 (0-30)
            let val = Math.floor(Math.random() * 30);
            data[y][x] = val;
        }
    }

    // 繪製數字 5 (設定高亮度 200-255)
    // 頂部橫線
    for (let x = 4; x <= 15; x++) {
        for (let y = 3; y <= 5; y++) {
            data[y][x] = 200 + Math.floor(Math.random() * 55);
        }
    }
    // 左側豎線 (上)
    for (let y = 3; y <= 9; y++) {
        for (let x = 4; x <= 6; x++) {
            data[y][x] = 200 + Math.floor(Math.random() * 55);
        }
    }
    // 中間橫線
    for (let x = 4; x <= 14; x++) {
        for (let y = 9; y <= 11; y++) {
            data[y][x] = 200 + Math.floor(Math.random() * 55);
        }
    }
    // 右側豎線 (下)
    for (let y = 9; y <= 15; y++) {
        for (let x = 13; x <= 15; x++) {
            data[y][x] = 200 + Math.floor(Math.random() * 55);
        }
    }
    // 底部橫線
    for (let x = 4; x <= 15; x++) { // 稍微縮短一點看起來更像 5
        for (let y = 15; y <= 17; y++) {
            data[y][x] = 200 + Math.floor(Math.random() * 55);
        }
    }
    // 底部左側勾勾 (Optional detail)
    for (let y = 13; y <= 17; y++) {
        for (let x = 4; x <= 6; x++) {
            data[y][x] = 200 + Math.floor(Math.random() * 55);
        }
    }
    // 修正：上面的"右側豎線(下)"和"底部左側勾" 可能會變成 6 或 8 或者奇怪的形狀
    // 重新繪製標準 5:
    // 1. 頂橫 (3-5 row, 4-15 col)
    // 2. 左上豎 (3-9 row, 4-6 col)
    // 3. 中橫 (9-11 row, 4-15 col)
    // 4. 右下豎 (11-16 row, 13-15 col)
    // 5. 底橫 (15-17 row, 4-13 col)

    // 重置為背景 (Clear area for 5)
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            data[y][x] = Math.floor(Math.random() * 30);
        }
    }

    // Draw 5
    // Top bar
    fillRect(data, 4, 3, 12, 3); // x=4, y=3, w=12, h=3 -> x:4-15, y:3-5
    // Upper vertical
    fillRect(data, 4, 3, 3, 7);  // x=4, y=3, w=3, h=7  -> x:4-6, y:3-9
    // Middle bar
    fillRect(data, 4, 9, 12, 3); // x=4, y=9, w=12, h=3 -> x:4-15, y:9-11
    // Lower vertical
    fillRect(data, 13, 11, 3, 6); // x=13, y=11, w=3, h=6 -> x:13-15, y:11-16
    // Bottom bar
    fillRect(data, 4, 15, 12, 3); // x=4, y=15, w=12, h=3 -> x:4-15, y:15-17

    window.pixelData = data;
    originImageData = data;
}

function fillRect(data, x, y, w, h) {
    for (let i = 0; i < h; i++) {
        for (let j = 0; j < w; j++) {
            data[y + i][x + j] = 200 + Math.floor(Math.random() * 55);
        }
    }
}

function drawInputGrid() {
    ctxInput.clearRect(0, 0, inputCanvas.width, inputCanvas.height);

    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            const val = originImageData[y][x];
            ctxInput.fillStyle = `rgb(${val}, ${val}, ${val})`;
            ctxInput.fillRect(x * cellSizeInput, y * cellSizeInput, cellSizeInput, cellSizeInput);
        }
    }

    // 網格線
    ctxInput.strokeStyle = 'rgba(100, 100, 100, 0.3)';
    ctxInput.lineWidth = 1;
    for (let i = 0; i <= gridSize; i++) {
        ctxInput.beginPath();
        ctxInput.moveTo(0, i * cellSizeInput);
        ctxInput.lineTo(gridSize * cellSizeInput, i * cellSizeInput);
        ctxInput.stroke();

        ctxInput.beginPath();
        ctxInput.moveTo(i * cellSizeInput, 0);
        ctxInput.lineTo(i * cellSizeInput, gridSize * cellSizeInput);
        ctxInput.stroke();
    }
}

// 執行池化運算
function applyPooling() {
    outputData = [];

    for (let outY = 0; outY < outputGridSize; outY++) {
        outputData[outY] = [];
        for (let outX = 0; outX < outputGridSize; outX++) {
            // 計算對應的輸入範圍左上角
            const startX = outX * stride;
            const startY = outY * stride;

            // 取得視窗內的數值
            let values = [];
            for (let ky = 0; ky < poolSize; ky++) {
                for (let kx = 0; kx < poolSize; kx++) {
                    values.push(originImageData[startY + ky][startX + kx]);
                }
            }

            // 計算結果
            let result = 0;
            if (currentMode === 'max') {
                result = Math.max(...values);
            } else {
                const sum = values.reduce((a, b) => a + b, 0);
                result = Math.round(sum / values.length);
            }

            outputData[outY][outX] = result;
        }
    }

    drawOutputGrid();
}

function drawOutputGrid() {
    ctxOutput.fillStyle = '#f8fafc';
    ctxOutput.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

    for (let y = 0; y < outputGridSize; y++) {
        for (let x = 0; x < outputGridSize; x++) {
            const val = outputData[y][x];
            ctxOutput.fillStyle = `rgb(${val}, ${val}, ${val})`;
            ctxOutput.fillRect(x * cellSizeOutput, y * cellSizeOutput, cellSizeOutput, cellSizeOutput);
        }
    }

    // 網格線
    ctxOutput.strokeStyle = 'rgba(100, 100, 100, 0.3)';
    ctxOutput.lineWidth = 1;
    for (let i = 0; i <= outputGridSize; i++) {
        ctxOutput.beginPath();
        ctxOutput.moveTo(0, i * cellSizeOutput);
        ctxOutput.lineTo(outputGridSize * cellSizeOutput, i * cellSizeOutput);
        ctxOutput.stroke();

        ctxOutput.beginPath();
        ctxOutput.moveTo(i * cellSizeOutput, 0);
        ctxOutput.lineTo(i * cellSizeOutput, outputGridSize * cellSizeOutput);
        ctxOutput.stroke();
    }
}

// 事件綁定
function bindEvents() {
    // 模式切換
    document.querySelectorAll('.btn-mode').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentMode = e.target.dataset.mode;
            applyPooling();
        });
    });

    // 滑鼠移動
    inputCanvas.addEventListener('mousemove', handleMouseMove);
    inputCanvas.addEventListener('mouseleave', () => {
        drawInputGrid();
        drawOutputGrid(); // 清除高亮
        mathOutput.innerHTML = '請將滑鼠移至左側圖片上...';
    });
}

function handleMouseMove(e) {
    const rect = inputCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const gridX = Math.floor(x / cellSizeInput);
    const gridY = Math.floor(y / cellSizeInput);

    if (gridX < 0 || gridX >= gridSize || gridY < 0 || gridY >= gridSize) return;

    // 找出所屬的 Pooling Window
    // 使用 Math.floor(gridX / stride) 算出這是第幾個 block
    const blockX = Math.floor(gridX / stride);
    const blockY = Math.floor(gridY / stride);

    // 計算該 block 的左上角輸入座標
    const startX = blockX * stride;
    const startY = blockY * stride;

    // 重繪並加框
    drawInputGrid();

    // 畫紅色框 (Pooling Window)
    ctxInput.strokeStyle = '#f43f5e';
    ctxInput.lineWidth = 3;
    ctxInput.strokeRect(startX * cellSizeInput, startY * cellSizeInput, poolSize * cellSizeInput, poolSize * cellSizeInput);

    // 重繪輸出並加藍框
    drawOutputGrid();
    const outX = blockX;
    const outY = blockY;

    ctxOutput.strokeStyle = '#3b82f6';
    ctxOutput.lineWidth = 3;
    ctxOutput.strokeRect(outX * cellSizeOutput, outY * cellSizeOutput, cellSizeOutput, cellSizeOutput);

    // 顯示詳細資訊
    showDetails(startX, startY, outX, outY);
}

function showDetails(startX, startY, outX, outY) {
    const values = [];
    let detailsHtml = '';

    // 更新中間示意圖
    poolingWindowDiv.innerHTML = '';

    for (let ky = 0; ky < poolSize; ky++) {
        for (let kx = 0; kx < poolSize; kx++) {
            const val = originImageData[startY + ky][startX + kx];
            values.push(val);

            const cell = document.createElement('div');
            cell.className = 'pool-cell';
            cell.textContent = val;
            cell.style.backgroundColor = `rgb(${val}, ${val}, ${val})`;
            cell.style.color = val > 128 ? '#000' : '#fff';
            poolingWindowDiv.appendChild(cell);
        }
    }

    const resultVal = outputData[outY][outX];
    poolResultDisplay.textContent = resultVal;
    poolResultDisplay.style.backgroundColor = `rgb(${resultVal}, ${resultVal}, ${resultVal})`;
    poolResultDisplay.style.color = resultVal > 128 ? '#000' : '#fff';

    // 更新文字說明
    if (currentMode === 'max') {
        const formula = `Max(${values.join(', ')})`;
        detailsHtml = `
            <strong>最大池化運算：</strong><br>
            在 2x2 區域中找出最大值。<br>
            <code>${formula} = ${resultVal}</code>
        `;
    } else {
        const sum = values.reduce((a, b) => a + b, 0);
        const formula = `(${values.join(' + ')}) / 4`;
        detailsHtml = `
            <strong>平均池化運算：</strong><br>
            計算 2x2 區域的平均值。<br>
            <code>${formula} = ${sum / 4}</code> <br> 
            取整數 → <strong>${resultVal}</strong>
        `;
    }

    mathOutput.innerHTML = detailsHtml;
}

init();
