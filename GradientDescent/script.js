const canvas = document.getElementById('gdCanvas');
const ctx = canvas.getContext('2d');
const lrSlider = document.getElementById('lrSlider');
const lrValue = document.getElementById('lrValue');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const randomBtn = document.getElementById('randomBtn');
const funcSelect = document.getElementById('funcSelect');
const stepCountEl = document.getElementById('stepCount');
const currentCostEl = document.getElementById('currentCost');
const currentPosEl = document.getElementById('currentPos');
const messageText = document.getElementById('messageText');

// 畫布座標設定
const width = canvas.width;
const height = canvas.height;
const centerX = width / 2;
const centerY = height / 2 + 100; // Y軸向下移一點，留出上方空間
const scaleX = 60; // X軸縮放
const scaleY = 60; // Y軸縮放

// 梯度下降參數
let lr = 0.1;
let currentX = 0;
let path = []; // 存儲 {x, cost}
let isRunning = false;
let animationId = null;
let step = 0;
const maxSteps = 100;

// 定義不同次方的函數與梯度 (1D)
// y = f(x)
const functions = {
    // 2次方：拋物線 (Convex)
    // f(x) = 0.5x^2-2
    deg2: {
        cost: (x) => 0.5 * x * x - 2,
        grad: (x) => x,
        label: "y = 0.5x²-2"
    },
    // 4次方：雙井 (Double Well) - 不對稱
    // f(x) = x^4 - 4x^2 + 0.5x + 3
    // 加入 0.5x 讓兩個低點深度不同
    deg4: {
        cost: (x) => Math.pow(x, 4) - 4 * x * x + 0.5 * x + 3,
        grad: (x) => 4 * Math.pow(x, 3) - 8 * x + 0.5,
        label: "y = x⁴ - 4x² + 0.5x + 3",
        scaleX: 130
    }
};

let currentFuncKey = 'deg2';
let currentFunc = functions.deg2;

// 座標轉換 (世界座標 -> 畫布座標)
function toScreen(x, y) {
    const sX = currentFunc.scaleX || scaleX;
    return {
        x: centerX + x * sX,
        y: centerY - y * scaleY // Y 軸向上為正，畫布 Y 軸向下為正
    };
}

// 座標轉換 (畫布座標 -> 世界座標)
function toWorld(screenX, screenY) {
    const sX = currentFunc.scaleX || scaleX;
    return {
        x: (screenX - centerX) / sX,
        y: (centerY - screenY) / scaleY
    };
}

// 繪製座標軸與函數曲線
function drawGraph() {
    ctx.clearRect(0, 0, width, height);

    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // 繪製網格 (選配，讓畫面不那麼空)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    // 垂直網格
    for (let i = -10; i <= 10; i++) {
        const x = toScreen(i, 0).x;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    // 水平網格
    for (let i = -5; i <= 10; i++) {
        const y = toScreen(0, i).y;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // 繪製座標軸 (粗線)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.lineWidth = 2;

    // X軸
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Y軸
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();

    // 繪製函數曲線
    ctx.beginPath();
    ctx.strokeStyle = '#3b82f6'; // Blue curve
    ctx.lineWidth = 3;

    // 從畫布左邊掃到右邊
    // screenX = 0 -> screenX = width
    let firstPoint = true;
    for (let sx = 0; sx <= width; sx += 2) {
        const worldX = toWorld(sx, 0).x;
        const worldY = currentFunc.cost(worldX);
        const screenY = toScreen(worldX, worldY).y;

        // 簡單的裁剪，避免畫到無限遠導致渲染問題
        if (screenY < -100 || screenY > height + 100) {
            firstPoint = true; // 斷開線條
            continue;
        }

        if (firstPoint) {
            ctx.moveTo(sx, screenY);
            firstPoint = false;
        } else {
            ctx.lineTo(sx, screenY);
        }
    }
    ctx.stroke();
}

// 繪製路徑 (Gradient Descent Path)
function drawPath() {
    if (path.length === 0) return;

    // 繪製虛線路徑
    if (path.length > 1) {
        ctx.beginPath();
        const start = toScreen(path[0].x, path[0].cost);
        ctx.moveTo(start.x, start.y);
        for (let i = 1; i < path.length; i++) {
            const p = toScreen(path[i].x, path[i].cost);
            ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = '#fbbf24'; // Amber
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]); // 虛線
        ctx.stroke();
        ctx.setLineDash([]); // 重置
    }

    // 繪製軌跡點
    path.forEach((p, index) => {
        const pos = toScreen(p.x, p.cost);

        ctx.beginPath();

        if (index === path.length - 1) {
            // 當前點 (球)
            ctx.arc(pos.x, pos.y, 8, 0, 2 * Math.PI);
            ctx.fillStyle = '#ef4444'; // Red ball
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 繪製切線 (梯度)
            const grad = currentFunc.grad(p.x);
            // 切線斜率 m = grad * (aspect ratio correction if needed, but here uniform scale)
            // y - y0 = m(x - x0)
            // Draw a short line segment +/- 0.5 unit in X
            const tanLen = 0.6;
            const p1 = toScreen(p.x - tanLen, p.cost - grad * tanLen);
            const p2 = toScreen(p.x + tanLen, p.cost + grad * tanLen);

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = '#10b981'; // Green tangent
            ctx.lineWidth = 2;
            ctx.stroke();

        } else {
            // 歷史軌跡點
            ctx.arc(pos.x, pos.y, 3, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(251, 191, 36, 0.5)'; // Transparent Amber
            ctx.fill();
        }
    });
}

// 更新資訊面板
function updateInfo() {
    stepCountEl.textContent = step;
    const cost = currentFunc.cost(currentX);
    currentCostEl.textContent = cost.toFixed(4);
    currentPosEl.textContent = `x = ${currentX.toFixed(4)}`;

    // 收斂/發散 訊息
    if (step >= maxSteps) {
        messageText.textContent = "達到最大步數。";
        messageText.style.color = "#94a3b8";
        return;
    }

    if (Math.abs(currentX) > 8) {
        messageText.textContent = "⚠️ 數值發散中！x 值過大。";
        messageText.style.color = "#ef4444";
    } else {
        messageText.textContent = `梯度 = ${currentFunc.grad(currentX).toFixed(4)}`;
        messageText.style.color = "#94a3b8";
    }
}

// 單步梯度下降
function gradientDescentStep() {
    if (!isRunning) return;
    if (step >= maxSteps) {
        stopSimulation();
        return;
    }

    const grad = currentFunc.grad(currentX);

    // 發散保護
    if (isNaN(currentX) || Math.abs(currentX) > 100) {
        stopSimulation();
        messageText.textContent = "⚠️ 已發散無限大。";
        return;
    }

    // 更新參數
    currentX = currentX - lr * grad;
    const currentCost = currentFunc.cost(currentX);

    path.push({ x: currentX, cost: currentCost });
    step++;

    drawGraph();
    drawPath();
    updateInfo();

    // 收斂判斷
    if (Math.abs(grad) < 0.001) {
        stopSimulation();
        messageText.textContent = "🎉 已收斂！梯度接近 0。";
        messageText.style.color = "#10b981";
    } else {
        animationId = requestAnimationFrame(() => {
            // 減慢一點以便觀察
            setTimeout(gradientDescentStep, 300);
        });
    }
}

function startSimulation() {
    if (isRunning) return;
    isRunning = true;
    startBtn.disabled = true;
    startBtn.textContent = "⏳ 執行中...";

    gradientDescentStep();
}

function stopSimulation() {
    isRunning = false;
    startBtn.disabled = false;
    startBtn.textContent = "▶ 繼續";
    cancelAnimationFrame(animationId);
}

function resetSimulation() {
    stopSimulation();
    startBtn.textContent = "▶ 開始下降";

    if (path.length > 0) {
        currentX = path[0].x; // 重置回起點
    }

    path = [{ x: currentX, cost: currentFunc.cost(currentX) }];
    step = 0;

    drawGraph();
    drawPath();
    updateInfo();
    messageText.textContent = "已重置。";
    messageText.style.color = "#94a3b8";
}

function randomizeStart() {
    stopSimulation();
    // 隨機範圍 X: -4 到 4
    currentX = (Math.random() * 8) - 4;

    path = [{ x: currentX, cost: currentFunc.cost(currentX) }];
    step = 0;

    drawGraph();
    drawPath();
    updateInfo();
    messageText.textContent = `隨機起點 x = ${currentX.toFixed(2)}`;
}

// 監聽器
lrSlider.addEventListener('input', (e) => {
    lr = parseFloat(e.target.value);
    lrValue.textContent = lr;
});

funcSelect.addEventListener('change', (e) => {
    currentFuncKey = e.target.value;
    currentFunc = functions[currentFuncKey];
    stopSimulation();
    randomizeStart();
});

startBtn.addEventListener('click', startSimulation);
resetBtn.addEventListener('click', resetSimulation);
randomBtn.addEventListener('click', randomizeStart);

canvas.addEventListener('mousedown', (e) => {
    if (isRunning) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    // 1D 中，Y 軸點擊不重要，只取 X
    const worldPos = toWorld(screenX, 0);
    currentX = worldPos.x;

    path = [{ x: currentX, cost: currentFunc.cost(currentX) }];
    step = 0;

    drawGraph();
    drawPath();
    updateInfo();
    messageText.textContent = `新起點 x = ${currentX.toFixed(2)}`;
});

// 初始化
function init() {
    currentFunc = functions['deg2'];
    randomizeStart();
}

init();
