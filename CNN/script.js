const inputCanvas = document.getElementById('inputCanvas');
const outputCanvas = document.getElementById('outputCanvas');
const ctxInput = inputCanvas.getContext('2d');
const ctxOutput = outputCanvas.getContext('2d');
const kernelGrid = document.getElementById('kernelGrid');
const mathOutput = document.getElementById('mathOutput');

// 3x3 Kernel 定義
const kernels3x3 = {
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

// 5x5 Kernel 定義
const kernels5x5 = {
    edge: [
        [0, 0, -1, 0, 0],
        [0, -1, -2, -1, 0],
        [-1, -2, 16, -2, -1],
        [0, -1, -2, -1, 0],
        [0, 0, -1, 0, 0]
    ],
    sharpen: [
        [0, 0, 0, 0, 0],
        [0, 0, -1, 0, 0],
        [0, -1, 5, -1, 0],
        [0, 0, -1, 0, 0],
        [0, 0, 0, 0, 0]
    ],
    boxBlur: [
        [1 / 25, 1 / 25, 1 / 25, 1 / 25, 1 / 25],
        [1 / 25, 1 / 25, 1 / 25, 1 / 25, 1 / 25],
        [1 / 25, 1 / 25, 1 / 25, 1 / 25, 1 / 25],
        [1 / 25, 1 / 25, 1 / 25, 1 / 25, 1 / 25],
        [1 / 25, 1 / 25, 1 / 25, 1 / 25, 1 / 25]
    ],
    emboss: [
        [-2, -1, 0, 1, 2],
        [-1, -1, 0, 1, 1],
        [-1, 0, 1, 0, 1],
        [-1, -1, 0, 1, 1],
        [-2, -1, 0, 1, 2]
    ],
    identity: [
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0]
    ],
    gaussian: [
        [1 / 273, 4 / 273, 7 / 273, 4 / 273, 1 / 273],
        [4 / 273, 16 / 273, 26 / 273, 16 / 273, 4 / 273],
        [7 / 273, 26 / 273, 41 / 273, 26 / 273, 7 / 273],
        [4 / 273, 16 / 273, 26 / 273, 16 / 273, 4 / 273],
        [1 / 273, 4 / 273, 7 / 273, 4 / 273, 1 / 273]
    ]
};

// 保留向後相容
const kernels = kernels3x3;

let currentKernel = kernels3x3.edge;
let currentKernelSize = 3;
let currentFilterKey = 'edge';
let usePadding = false; // 預設為 Valid Padding (No Padding)
let originImageData = null;
const gridSize = 15;  // 15x15 像素網格
const cellSize = 20;  // 每個像素格子的顯示大小
const canvasSize = gridSize * cellSize;  // 300x300 畫布

// 初始化
function init() {
    // 設定畫布大小
    inputCanvas.width = canvasSize;
    inputCanvas.height = canvasSize;
    outputCanvas.width = canvasSize;
    outputCanvas.height = canvasSize;

    // 繪製 15x15 像素網格圖案
    drawPixelGrid();

    // 取得影像數據 (每個像素的中心值)
    originImageData = getGridData();
    applyConvolution();
    drawGridLines(ctxInput);
    // 不再為輸出畫布繪製網格線，保持特徵圖的清晰度

    // 處理濾鏡按鈕點擊
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // 更新按鈕狀態
            document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            // 切換 Kernel
            currentFilterKey = e.target.dataset.filter;
            updateCurrentKernel();
            updateKernelGridDisplay();
            applyConvolution();
        });
    });

    // 處理 Padding 按鈕點擊
    document.querySelectorAll('.btn-padding').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // 更新按鈕狀態
            document.querySelectorAll('.btn-padding').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            // 切換 Padding 模式
            usePadding = e.target.dataset.padding === 'same';
            applyConvolution();
        });
    });

    // 處理 Kernel 尺寸按鈕點擊
    document.querySelectorAll('.btn-size').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // 更新按鈕狀態
            document.querySelectorAll('.btn-size').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            // 切換 Kernel 尺寸
            currentKernelSize = parseInt(e.target.dataset.size);

            // 顯示/隱藏 5x5 專屬濾鏡
            const gaussian5x5Btn = document.querySelector('.btn-5x5-only');
            if (gaussian5x5Btn) {
                gaussian5x5Btn.style.display = currentKernelSize === 5 ? 'inline-block' : 'none';
            }

            // 如果當前選擇的是 gaussian 但切回 3x3，改為 edge
            if (currentKernelSize === 3 && currentFilterKey === 'gaussian') {
                currentFilterKey = 'edge';
                document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
                document.querySelector('.btn-filter[data-filter="edge"]').classList.add('active');
            }

            updateCurrentKernel();
            updateKernelGridDisplay();
            applyConvolution();
        });
    });

    // 滑鼠互動事件
    inputCanvas.addEventListener('mousemove', handleMouseMove);
    inputCanvas.addEventListener('mouseleave', () => {
        // 重繪原圖清除高亮框
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const val = originImageData[y][x];
                ctxInput.fillStyle = `rgb(${val}, ${val}, ${val})`;
                ctxInput.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
        drawGridLines(ctxInput);
        mathOutput.innerHTML = '請將滑鼠移至左側圖片上...';
    });
}

// 繪製 15x15 像素網格圖案 (簡單的圖案，有清晰的邊緣)
function drawPixelGrid() {
    // 定義 15x15 像素值 (灰階 0-255)
    // 繪製一個模擬手寫數字 "5" 的圖案
    const pattern = [
        [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255],
        [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255],
        [255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 50, 255, 255, 255, 255],
        [255, 255, 255, 255, 0, 50, 50, 50, 50, 50, 100, 255, 255, 255, 255],
        [255, 255, 255, 255, 0, 10, 255, 255, 255, 255, 255, 255, 255, 255, 255],
        [255, 255, 255, 255, 0, 10, 255, 255, 255, 255, 255, 255, 255, 255, 255],
        [255, 255, 255, 255, 0, 0, 0, 0, 0, 50, 255, 255, 255, 255, 255],
        [255, 255, 255, 255, 50, 50, 50, 50, 0, 0, 50, 255, 255, 255, 255],
        [255, 255, 255, 255, 100, 255, 255, 255, 50, 0, 50, 255, 255, 255, 255],
        [255, 255, 255, 255, 255, 255, 255, 255, 50, 0, 50, 255, 255, 255, 255],
        [255, 255, 255, 255, 255, 255, 255, 255, 50, 0, 50, 255, 255, 255, 255],
        [255, 255, 255, 255, 255, 255, 255, 255, 50, 0, 50, 255, 255, 255, 255],
        [255, 255, 255, 255, 50, 0, 50, 50, 0, 0, 100, 255, 255, 255, 255],
        [255, 255, 255, 255, 50, 0, 0, 0, 0, 50, 255, 255, 255, 255, 255],
        [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255],
    ];

    // 儲存像素數據
    window.pixelData = pattern;

    // 繪製到畫布
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            const val = pattern[y][x];
            ctxInput.fillStyle = `rgb(${val}, ${val}, ${val})`;
            ctxInput.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
    }
}

// 繪製網格線
function drawGridLines(ctx) {
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSize; i++) {
        // 横線
        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(canvasSize, i * cellSize);
        ctx.stroke();
        // 豎線
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, canvasSize);
        ctx.stroke();
    }
}

// 繪製特徵圖的網格線 (僅在有效區域)
function drawOutputGridLines(validSize, offset) {
    ctxOutput.strokeStyle = 'rgba(100, 100, 100, 0.3)';
    ctxOutput.lineWidth = 1;
    const areaSize = validSize * cellSize;

    for (let i = 0; i <= validSize; i++) {
        // 横線
        ctxOutput.beginPath();
        ctxOutput.moveTo(offset, offset + i * cellSize);
        ctxOutput.lineTo(offset + areaSize, offset + i * cellSize);
        ctxOutput.stroke();
        // 豎線
        ctxOutput.beginPath();
        ctxOutput.moveTo(offset + i * cellSize, offset);
        ctxOutput.lineTo(offset + i * cellSize, offset + areaSize);
        ctxOutput.stroke();
    }
}

// 取得網格數據
function getGridData() {
    return window.pixelData;
}

// 更新當前使用的 Kernel
function updateCurrentKernel() {
    if (currentKernelSize === 3) {
        currentKernel = kernels3x3[currentFilterKey];
    } else {
        currentKernel = kernels5x5[currentFilterKey];
    }

    // 更新標題顯示
    const kernelTitle = document.getElementById('kernelTitle');
    if (kernelTitle) {
        kernelTitle.textContent = `當前濾鏡 (Kernel ${currentKernelSize}×${currentKernelSize})`;
    }
}

// 更新 Kernel 網格顯示
function updateKernelGridDisplay() {
    kernelGrid.innerHTML = '';
    // 動態設定網格欄數
    kernelGrid.style.gridTemplateColumns = `repeat(${currentKernelSize}, 1fr)`;

    for (let y = 0; y < currentKernelSize; y++) {
        for (let x = 0; x < currentKernelSize; x++) {
            const cell = document.createElement('div');
            cell.className = 'kernel-cell';
            // 處理浮點數顯示
            let val = currentKernel[y][x];
            cell.textContent = Number.isInteger(val) ? val : val.toFixed(2);
            kernelGrid.appendChild(cell);
        }
    }
}

// 應用卷積運算 (15x15 網格)
function applyConvolution() {
    if (!originImageData) return;

    const inputData = originImageData;
    const outputData = [];
    const halfK = Math.floor(currentKernelSize / 2);

    // 初始化輸出數據
    for (let y = 0; y < gridSize; y++) {
        outputData[y] = [];
        for (let x = 0; x < gridSize; x++) {
            outputData[y][x] = 0;
        }
    }

    // 決定運算範圍
    let start, end;
    if (usePadding) {
        // Same Padding: 運算範圍覆蓋全圖，邊界補零
        start = 0;
        end = gridSize;
    } else {
        // Valid Padding: 忽略邊界
        start = halfK;
        end = gridSize - halfK;
    }

    // 對每個像素進行卷積
    for (let y = start; y < end; y++) {
        for (let x = start; x < end; x++) {
            let sum = 0;

            // 動態卷積運算
            for (let ky = -halfK; ky <= halfK; ky++) {
                for (let kx = -halfK; kx <= halfK; kx++) {
                    const inputY = y + ky;
                    const inputX = x + kx;

                    let pixelVal = 0;
                    // 邊界檢查 (Zero Padding)
                    if (inputY >= 0 && inputY < gridSize && inputX >= 0 && inputX < gridSize) {
                        pixelVal = inputData[inputY][inputX];
                    }

                    const weight = currentKernel[ky + halfK][kx + halfK];
                    sum += pixelVal * weight;
                }
            }

            // Clamp 到 0-255
            outputData[y][x] = Math.max(0, Math.min(255, Math.round(sum)));
        }
    }

    window.outputPixelData = outputData;

    // 計算有效輸出區域大小
    const validSize = usePadding ? gridSize : gridSize - 2 * halfK;
    // 使用與輸入相同的 cellSize，讓視覺上明顯看出圖片變小
    const outputAreaSize = validSize * cellSize;
    const offset = Math.floor((canvasSize - outputAreaSize) / 2);  // 置中偏移

    // 清空輸出畫布，使用淺色背景
    ctxOutput.fillStyle = '#f8fafc';
    ctxOutput.fillRect(0, 0, canvasSize, canvasSize);

    // 繪製有效與無效卷積區域
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            // 如果使用 Padding，則繪製全部；否則只繪製中心有效區
            if (usePadding || (y >= halfK && y < gridSize - halfK && x >= halfK && x < gridSize - halfK)) {
                // 從 outputData 中取得對應的有效區域值
                // 如果是 Valid Padding，需要調整索引來對齊顯示中心
                const dataY = y;
                const dataX = x;

                // 計算顯示位置
                let dispX, dispY;
                if (usePadding) {
                    dispX = offset + x * cellSize;
                    dispY = offset + y * cellSize;
                } else {
                    // 需將有效區域映射到置中的顯示格子
                    dispX = offset + (x - halfK) * cellSize;
                    dispY = offset + (y - halfK) * cellSize;
                }

                const val = outputData[dataY][dataX];
                ctxOutput.fillStyle = `rgb(${val}, ${val}, ${val})`;
                ctxOutput.fillRect(dispX, dispY, cellSize, cellSize);
            }
        }
    }

    // 繪製特徵圖的網格線
    drawOutputGridLines(validSize, offset);

    // 更新特徵圖標籤說明
    updateFeatureMapLabel(validSize);
}

// 繪製特徵圖並標示對應像素（藍色高亮框）
function drawOutputWithHighlight(gridX, gridY) {
    if (!window.outputPixelData) return;

    const halfK = Math.floor(currentKernelSize / 2);
    const validSize = usePadding ? gridSize : gridSize - 2 * halfK;
    const outputAreaSize = validSize * cellSize;
    const offset = Math.floor((canvasSize - outputAreaSize) / 2);

    // 清空輸出畫布
    ctxOutput.fillStyle = '#f8fafc';
    ctxOutput.fillRect(0, 0, canvasSize, canvasSize);

    // 繪製有效與無效卷積區域
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            if (usePadding || (y >= halfK && y < gridSize - halfK && x >= halfK && x < gridSize - halfK)) {
                let dispX, dispY;
                if (usePadding) {
                    dispX = offset + x * cellSize;
                    dispY = offset + y * cellSize;
                } else {
                    dispX = offset + (x - halfK) * cellSize;
                    dispY = offset + (y - halfK) * cellSize;
                }

                let val = 0;
                // 注意：window.outputPixelData 已經是全尺寸的 (15x15)，未計算區域為 0
                // 所以直接取值即可，但在 Valid Padding 模式下，只有中間部分有值
                if (window.outputPixelData[y] && window.outputPixelData[y][x] !== undefined) {
                    val = window.outputPixelData[y][x];
                }

                ctxOutput.fillStyle = `rgb(${val}, ${val}, ${val})`;
                ctxOutput.fillRect(dispX, dispY, cellSize, cellSize);
            }
        }
    }

    // 繪製網格線
    drawOutputGridLines(validSize, offset);

    // 計算對應的輸出座標
    // 若使用 Padding，輸出座標 = 輸入座標
    // 若無 Padding，輸出座標 = 輸入座標 - halfK
    const outputX = usePadding ? gridX : gridX - halfK;
    const outputY = usePadding ? gridY : gridY - halfK;

    // 繪製藍色高亮框在對應的輸出像素
    if (outputX >= 0 && outputX < validSize && outputY >= 0 && outputY < validSize) {
        ctxOutput.strokeStyle = '#3b82f6';  // 藍色
        ctxOutput.lineWidth = 3;
        ctxOutput.strokeRect(
            offset + outputX * cellSize + 1,
            offset + outputY * cellSize + 1,
            cellSize - 2,
            cellSize - 2
        );
    }
}

// 處理滑鼠移動：顯示各別運算細節
function handleMouseMove(e) {
    if (!originImageData) return;

    const rect = inputCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 轉換為網格座標
    const gridX = Math.floor(mouseX / cellSize);
    const gridY = Math.floor(mouseY / cellSize);

    const halfK = Math.floor(currentKernelSize / 2);

    // 邊界檢查
    // 如果開啟 Padding，允許滑鼠在整個網格上移動
    // 如果關閉 Padding，滑鼠只能在有效中心區域移動
    let isValidMove = false;
    if (usePadding) {
        isValidMove = gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize;
    } else {
        isValidMove = gridX >= halfK && gridX < gridSize - halfK && gridY >= halfK && gridY < gridSize - halfK;
    }

    if (!isValidMove) {
        mathOutput.innerHTML = usePadding ? '請將滑鼠移至圖片區域...' : '請將滑鼠移至圖片中心區域 (避開邊緣)...';
        return;
    }

    // 重繪輸入畫布
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            const val = originImageData[y][x];
            ctxInput.fillStyle = `rgb(${val}, ${val}, ${val})`;
            ctxInput.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
    }
    drawGridLines(ctxInput);

    // 繪製輸入圖像的動態高亮框（紅色）
    // 注意：當開啟 Padding 時，kernel 可能會超出邊界，這時我們繪製的框也應該能顯示出這種狀態
    // 這裡我們簡單計算框的左上角位置
    const boxX = (gridX - halfK) * cellSize;
    const boxY = (gridY - halfK) * cellSize;

    ctxInput.strokeStyle = '#f43f5e';
    ctxInput.lineWidth = 3;
    ctxInput.strokeRect(
        boxX + 1,
        boxY + 1,
        cellSize * currentKernelSize - 2,
        cellSize * currentKernelSize - 2
    );

    // 重繪特徵圖並在對應像素繪製藍色高亮框
    drawOutputWithHighlight(gridX, gridY);

    // 顯示計算過程
    showCalculationDetails(gridX, gridY);
}

function showCalculationDetails(cx, cy) {
    const inputData = originImageData;
    const halfK = Math.floor(currentKernelSize / 2);
    const cellSizeDisplay = currentKernelSize === 3 ? 40 : 28;  // 5x5 時縮小顯示

    let html = `<strong>中心像素 (${cx}, ${cy}) 的卷積運算：</strong><br><br>`;
    html += '<div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: center;">';

    // 左側：像素值
    html += '<div style="text-align: center;"><strong>像素值</strong><br>';
    html += `<div style="display: inline-grid; grid-template-columns: repeat(${currentKernelSize}, ${cellSizeDisplay}px); gap: 2px; margin-top: 5px;">`;
    for (let ky = -halfK; ky <= halfK; ky++) {
        for (let kx = -halfK; kx <= halfK; kx++) {
            const inputY = cy + ky;
            const inputX = cx + kx;

            let val = 0; // Default padding value
            let isPadding = true;

            if (inputY >= 0 && inputY < gridSize && inputX >= 0 && inputX < gridSize) {
                val = inputData[inputY][inputX];
                isPadding = false;
            }

            const bgColor = isPadding ? '#e2e8f0' : `rgb(${val},${val},${val})`;
            const textColor = isPadding ? '#94a3b8' : (val > 128 ? '#000' : '#fff');

            html += `<div style="background: ${bgColor}; color: ${textColor}; padding: ${currentKernelSize === 3 ? 8 : 4}px; border-radius: 4px; font-family: monospace; font-size: ${currentKernelSize === 3 ? '1rem' : '0.75rem'};">${val}</div>`;
        }
    }
    html += '</div></div>';

    // 中間：乘號
    html += '<div style="font-size: 1.5rem;">×</div>';

    // 右側：Kernel
    html += '<div style="text-align: center;"><strong>Kernel</strong><br>';
    html += `<div style="display: inline-grid; grid-template-columns: repeat(${currentKernelSize}, ${cellSizeDisplay}px); gap: 2px; margin-top: 5px;">`;
    for (let ky = 0; ky < currentKernelSize; ky++) {
        for (let kx = 0; kx < currentKernelSize; kx++) {
            const weight = currentKernel[ky][kx];
            const weightStr = Number.isInteger(weight) ? weight : weight.toFixed(2);
            html += `<div style="background: #e0e7ff; color: #1e3a8a; font-weight: bold; padding: ${currentKernelSize === 3 ? 8 : 4}px; border-radius: 4px; font-family: monospace; font-size: ${currentKernelSize === 3 ? '1rem' : '0.75rem'};">${weightStr}</div>`;
        }
    }
    html += '</div></div>';
    html += '</div>';

    // 計算過程
    html += '<hr style="margin: 15px 0; border: none; border-top: 1px solid #e2e8f0;">';
    html += '<div style="font-family: monospace; font-size: 0.8rem; word-wrap: break-word;">';

    let formula = '';
    let total = 0;
    let nonZeroCount = 0;
    for (let ky = -halfK; ky <= halfK; ky++) {
        for (let kx = -halfK; kx <= halfK; kx++) {
            const inputY = cy + ky;
            const inputX = cx + kx;

            let pixelVal = 0;
            if (inputY >= 0 && inputY < gridSize && inputX >= 0 && inputX < gridSize) {
                pixelVal = inputData[inputY][inputX];
            }

            const weight = currentKernel[ky + halfK][kx + halfK];
            const weightStr = Number.isInteger(weight) ? weight : weight.toFixed(2);

            if (weight !== 0) {
                nonZeroCount++;
                // 如果是 5x5 且有太多項目，簡化顯示
                if (currentKernelSize === 5 && nonZeroCount > 9) {
                    if (nonZeroCount === 10) formula += ' + ...';
                } else {
                    const term = `(${pixelVal}×${weightStr})`;
                    formula += formula === '' ? term : ` + ${term}`;
                }
                total += pixelVal * weight;
            }
        }
    }

    const clampedTotal = Math.max(0, Math.min(255, Math.round(total)));
    html += formula + ` = <strong>${Math.round(total)}</strong>`;
    if (total !== clampedTotal) {
        html += ` → Clamp → <strong style="color: #f43f5e;">${clampedTotal}</strong>`;
    }
    html += '</div>';

    mathOutput.innerHTML = html;
}

// 更新特徵圖標籤，顯示有效輸出尺寸
function updateFeatureMapLabel(validSize) {
    const label = document.getElementById('featureMapLabel');
    if (label) {
        label.textContent = `特徵圖 (Feature Map) - ${validSize}×${validSize}`;
    }
}

// 啟動
init();
updateKernelGridDisplay();
