/**
 * Q-Learning 互動教學核心邏輯
 */

// ===========================
// 全域設定與狀態
// ===========================
const CONFIG = {
    GRID_SIZE: 4,     // 4x4 Grid
    CELL_SIZE: 0,     // Calculated dynamically
    CANVAS_SIZE: 500,
    ACTIONS: ['UP', 'RIGHT', 'DOWN', 'LEFT'], // 0, 1, 2, 3
};

const REWARDS = {
    GOAL: 100,
    TRAP: -100,
    STEP: -1,
    WALL: -5 // Penalty for hitting wall
};

// State Interface
let state = {
    agentX: 0,
    agentY: 0,
    episode: 0,
    totalReward: 0,
    steps: 0,
    isRunning: false,
    speed: 10, // Frames interval
    timer: null,

    // Hyperparameters
    epsilon: 0.1,
    alpha: 0.1,
    gamma: 0.9,

    // Environment
    grid: [], // 2D array: 'START', 'EMPTY', 'TRAP', 'GOAL'
    qTable: {}, // Key: "x,y", Value: [q_up, q_right, q_down, q_left]

    // Highlight logic
    highlightState: null, // {x, y, type}
    highlightTimer: 0,

    // Tooltip for Q-value display
    hoverCell: null, // {x, y}
    mousePos: null, // {x, y} pixel position

    chart: null,
    historyRewards: []
};

// ===========================
// 環境類別 (Grid World)
// ===========================
class GridEnvironment {
    constructor() {
        this.resetMap();
    }

    resetMap() {
        // Init 4x4 Map
        // S . . .
        // . # . #
        // . . . #
        // # . . G
        // S: Start, G: Goal, #: Trap/Pit

        // Simple Fixed Map for teaching stability
        // 0: Empty, 1: Trap, 2: Goal, 3: Start
        // Coordinate: (x, y) where x is col, y is row. Top-Left is (0,0)

        this.map = [
            ['S', '.', '.', '.'],
            ['.', 'T', '.', 'T'],
            ['.', '.', '.', 'T'],
            ['T', '.', '.', 'G']
        ];

        // Find Start Position
        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                if (this.map[y][x] === 'S') {
                    state.agentX = x;
                    state.agentY = y;
                }
            }
        }
    }

    getReward(x, y) {
        const type = this.map[y][x];
        if (type === 'G') return REWARDS.GOAL;
        if (type === 'T') return REWARDS.TRAP;
        return REWARDS.STEP;
    }

    isTerminal(x, y) {
        const type = this.map[y][x];
        return type === 'G' || type === 'T';
    }
}

// ===========================
// Agent 類別 (Q-Learning)
// ===========================
class QLearningAgent {
    constructor() {
        this.initQTable();
    }

    initQTable() {
        state.qTable = {};
        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                // Initialize Q-Values to 0
                state.qTable[`${x},${y}`] = [0, 0, 0, 0];
            }
        }
    }

    getQ(x, y, actionIdx) {
        return state.qTable[`${x},${y}`][actionIdx];
    }

    setQ(x, y, actionIdx, val) {
        state.qTable[`${x},${y}`][actionIdx] = val;
    }

    getMaxQ(x, y) {
        return Math.max(...state.qTable[`${x},${y}`]);
    }

    // Epsilon-Greedy Policy
    chooseAction(x, y) {
        // Exploration
        if (Math.random() < state.epsilon) {
            return Math.floor(Math.random() * 4);
        }

        // Exploitation
        const qValues = state.qTable[`${x},${y}`];
        // Find indices of max value (handle ties randomly)
        const maxVal = Math.max(...qValues);
        const maxIndices = [];
        qValues.forEach((v, i) => {
            if (v === maxVal) maxIndices.push(i);
        });

        return maxIndices[Math.floor(Math.random() * maxIndices.length)];
    }

    // Q-Learning Update Rule
    learn(x, y, action, reward, nextX, nextY) {
        const predict = this.getQ(x, y, action);
        const target = reward + state.gamma * this.getMaxQ(nextX, nextY);

        // Q(s,a) = Q(s,a) + alpha * (target - Q(s,a))
        const newQ = predict + state.alpha * (target - predict);
        this.setQ(x, y, action, newQ);
    }
}

// ===========================
// 主程式邏輯
// ===========================
const env = new GridEnvironment();
const agent = new QLearningAgent();
const canvas = document.getElementById('gridCanvas');
const ctx = canvas.getContext('2d');

let animationFrameId;

document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    initControls();
    initChart();
    render();
});

function initCanvas() {
    // High DPI Handling
    const size = CONFIG.CANVAS_SIZE;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    CONFIG.CELL_SIZE = size / CONFIG.GRID_SIZE;

    // 滑鼠懸停事件 - 顯示 Q 值
    canvas.addEventListener('mousemove', handleCanvasHover);
    canvas.addEventListener('mouseleave', () => {
        state.hoverCell = null;
        state.mousePos = null;
        render();
    });
}

function handleCanvasHover(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cellX = Math.floor(x / CONFIG.CELL_SIZE);
    const cellY = Math.floor(y / CONFIG.CELL_SIZE);

    if (cellX >= 0 && cellX < CONFIG.GRID_SIZE && cellY >= 0 && cellY < CONFIG.GRID_SIZE) {
        state.hoverCell = { x: cellX, y: cellY };
        state.mousePos = { x, y };
    } else {
        state.hoverCell = null;
        state.mousePos = null;
    }
    render();
}

function initControls() {
    // Hyperparameters
    bindSlider('epsSlider', 'epsValue', v => state.epsilon = v / 100);
    bindSlider('alphaSlider', 'alphaValue', v => state.alpha = v / 100);
    bindSlider('gammaSlider', 'gammaValue', v => state.gamma = v / 100);

    // Speed
    const speedSlider = document.getElementById('speedSlider');
    speedSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        state.speed = 51 - val; // Invert: High value = Low interval (Fast)
        document.getElementById('speedValue').textContent = val;

        // Restart timer if running
        if (state.isRunning) {
            clearInterval(state.timer);
            startTrainingLoop();
        }
    });

    // Buttons
    document.getElementById('btnTrain').addEventListener('click', toggleTraining);
    document.getElementById('btnReset').addEventListener('click', resetAll);
}

function bindSlider(id, displayId, callback) {
    const slider = document.getElementById(id);
    const display = document.getElementById(displayId);
    slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        display.textContent = (val / 100).toFixed(2);
        callback(val);
    });
}

// Chart.js
function initChart() {
    const ctxChart = document.getElementById('rewardChart').getContext('2d');
    state.chart = new Chart(ctxChart, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Total Reward',
                data: [],
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderWidth: 2,
                tension: 0.1,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: '回合數 (Episode)',
                        color: 'rgba(255, 255, 255, 0.5)'
                    },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    title: {
                        display: true,
                        text: '分數 (Reward)',
                        color: 'rgba(255, 255, 255, 0.5)'
                    }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function updateChart(reward) {
    state.historyRewards.push(reward);
    state.chart.data.labels.push(state.episode);
    state.chart.data.datasets[0].data.push(reward);

    // Keep chart mostly clean, limit history view if needed? 
    // For now keep all.

    state.chart.update();
}

// ===========================
// Loop Logic
// ===========================
function toggleTraining() {
    state.isRunning = !state.isRunning;
    const btn = document.getElementById('btnTrain');

    if (state.isRunning) {
        btn.textContent = "暫停訓練";
        btn.classList.replace('btn-primary', 'btn-secondary');
        startTrainingLoop();
    } else {
        btn.textContent = "繼續訓練";
        btn.classList.replace('btn-secondary', 'btn-primary');
        clearInterval(state.timer);
    }
}

function startTrainingLoop() {
    state.timer = setInterval(() => {
        step();
        render();
    }, state.speed * 10); // Adjust speed scaling
}

function resetAll() {
    state.isRunning = false;
    clearInterval(state.timer);
    document.getElementById('btnTrain').textContent = "開始訓練";
    document.getElementById('btnTrain').classList.replace('btn-secondary', 'btn-primary');

    agent.initQTable();
    env.resetMap();
    state.episode = 0;
    state.totalReward = 0;
    state.steps = 0;
    state.historyRewards = [];

    // Reset Chart
    state.chart.data.labels = [];
    state.chart.data.datasets[0].data = [];
    state.chart.update();

    // Clear Highlight
    state.highlightState = null;
    state.highlightTimer = 0;

    updateStatsUI();
    render();
}

function step() {
    // 0. Handle Highlight Pause (Visual Feedback)
    if (state.highlightTimer > 0) {
        state.highlightTimer--;
        if (state.highlightTimer === 0) {
            state.highlightState = null;
            resetEpisode();
        }
        return; // Pause execution
    }

    const { agentX, agentY } = state;

    // 1. Choose Action
    const action = agent.chooseAction(agentX, agentY);

    // 2. Perform Action (Move)
    let nextX = agentX;
    let nextY = agentY;

    if (action === 0) nextY = Math.max(0, agentY - 1);      // UP
    else if (action === 1) nextX = Math.min(3, agentX + 1); // RIGHT
    else if (action === 2) nextY = Math.min(3, agentY + 1); // DOWN
    else if (action === 3) nextX = Math.max(0, agentX - 1); // LEFT

    // Check if hit wall (didn't move) -> Optional penalty?
    // In this simple grid code, hitting wall just stays in place.
    // Let's allow step penalty to accumulate.

    // 3. Get Reward
    const reward = env.getReward(nextX, nextY);
    state.totalReward += reward;
    state.steps++;

    // 4. Update Q-Table
    agent.learn(agentX, agentY, action, reward, nextX, nextY);

    // 5. Update State
    state.agentX = nextX;
    state.agentY = nextY;

    // 6. Check Terminal State
    if (env.isTerminal(nextX, nextY)) {
        // Episode Finished
        updateChart(state.totalReward);

        // Trigger Highlight instead of immediate reset
        // Calculate frames for approx 500ms delay based on speed
        // Interval is state.speed * 10 ms. 
        // 500 / (speed*10) = 50 / speed
        const interval = state.speed * 10;
        state.highlightTimer = Math.max(2, Math.floor(500 / interval));
        state.highlightState = { x: nextX, y: nextY, type: env.map[nextY][nextX] };
    }

    updateStatsUI();
}

function resetEpisode() {
    state.episode++;
    state.totalReward = 0;
    state.steps = 0;
    env.resetMap(); // Reset agent to 'S'
}

function updateStatsUI() {
    document.getElementById('valEpisode').textContent = state.episode;
    document.getElementById('valReward').textContent = state.totalReward;
    document.getElementById('valSteps').textContent = state.steps;
}

// ===========================
// Visualization (Canvas)
// ===========================
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cs = CONFIG.CELL_SIZE;

    for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
        for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
            const posX = x * cs;
            const posY = y * cs;

            // Draw Highlight if active
            if (state.highlightState && state.highlightState.x === x && state.highlightState.y === y) {
                const type = state.highlightState.type;
                ctx.fillStyle = type === 'G' ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)';
                ctx.fillRect(posX, posY, cs, cs);
                // Glow effect
                ctx.shadowBlur = 20;
                ctx.shadowColor = type === 'G' ? '#22c55e' : '#ef4444';
            } else {
                ctx.shadowBlur = 0;
            }

            // Draw Q-Values (Heatmap Triangles)
            drawQValues(x, y, posX, posY, cs);
            ctx.shadowBlur = 0; // Reset shadow

            // Draw Grid Lines
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            ctx.strokeRect(posX, posY, cs, cs);

            // Draw Objects
            const type = env.map[y][x];
            if (type === 'G') drawIcon('🏁', posX, posY, cs); // Goal
            else if (type === 'T') drawIcon('🔥', posX, posY, cs); // Trap
            // else if (type === 'S') drawIcon('🏠', posX, posY, cs); // Start
        }
    }

    // Draw Agent
    const ax = state.agentX * cs + cs / 2;
    const ay = state.agentY * cs + cs / 2;

    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(ax, ay, cs * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Agent Eyes (Cute Robot)
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(ax - cs * 0.08, ay - cs * 0.05, cs * 0.06, 0, Math.PI * 2);
    ctx.arc(ax + cs * 0.08, ay - cs * 0.05, cs * 0.06, 0, Math.PI * 2);
    ctx.fill();

    // 繪製 Q 值 Tooltip
    drawQTooltip();
}

function drawQTooltip() {
    if (!state.hoverCell || !state.mousePos) return;

    const { x, y } = state.hoverCell;
    const q = state.qTable[`${x},${y}`];
    if (!q) return;

    const labels = ['↑ 上', '→ 右', '↓ 下', '← 左'];
    const lines = labels.map((label, i) => `${label}: ${q[i].toFixed(2)}`);
    const maxQ = Math.max(...q);
    const maxIdx = q.indexOf(maxQ);

    // Tooltip 尺寸
    const padding = 10;
    const lineHeight = 18;
    const tooltipWidth = 100;
    const tooltipHeight = lines.length * lineHeight + padding * 2;

    // 計算 Tooltip 位置（避免超出畫布邊界）
    let tooltipX = state.mousePos.x + 15;
    let tooltipY = state.mousePos.y + 15;

    if (tooltipX + tooltipWidth > CONFIG.CANVAS_SIZE) {
        tooltipX = state.mousePos.x - tooltipWidth - 15;
    }
    if (tooltipY + tooltipHeight > CONFIG.CANVAS_SIZE) {
        tooltipY = state.mousePos.y - tooltipHeight - 15;
    }

    // 繪製背景
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 8);
    ctx.fill();
    ctx.stroke();

    // 繪製文字
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    lines.forEach((line, i) => {
        // 最大 Q 值的方向用綠色標示
        if (i === maxIdx && maxQ !== 0) {
            ctx.fillStyle = '#22c55e';
        } else {
            ctx.fillStyle = '#f1f5f9';
        }
        ctx.fillText(line, tooltipX + padding, tooltipY + padding + i * lineHeight);
    });
}

function drawQValues(x, y, px, py, size) {
    const q = state.qTable[`${x},${y}`];
    const center = size / 2;

    // UP (0)
    drawTriangle(px, py, size, 0, q[0]);
    // RIGHT (1)
    drawTriangle(px, py, size, 1, q[1]);
    // DOWN (2)
    drawTriangle(px, py, size, 2, q[2]);
    // LEFT (3)
    drawTriangle(px, py, size, 3, q[3]);

    // Overlay Text for Max Q (optional, maybe too cluttered)
    // const maxQ = Math.max(...q);
    // ctx.fillStyle = 'rgba(255,255,255,0.7)';
    // ctx.font = '10px monospace';
    // ctx.fillText(maxQ.toFixed(1), px + center - 10, py + center);
}

function drawTriangle(px, py, size, dir, value) {
    // dir: 0=Up, 1=Right, 2=Down, 3=Left
    ctx.beginPath();
    const cx = px + size / 2;
    const cy = py + size / 2;

    if (dir === 0) { // Top
        ctx.moveTo(px, py);
        ctx.lineTo(px + size, py);
        ctx.lineTo(cx, cy);
    } else if (dir === 1) { // Right
        ctx.moveTo(px + size, py);
        ctx.lineTo(px + size, py + size);
        ctx.lineTo(cx, cy);
    } else if (dir === 2) { // Bottom
        ctx.moveTo(px + size, py + size);
        ctx.lineTo(px, py + size);
        ctx.lineTo(cx, cy);
    } else if (dir === 3) { // Left
        ctx.moveTo(px, py + size);
        ctx.lineTo(px, py);
        ctx.lineTo(cx, cy);
    }

    // Color based on Q value
    // Max positive ~100 (Goal), Max negative ~-100 (Trap)
    // Scale intensity
    const maxVal = 100;
    let alpha = Math.abs(value) / maxVal;
    alpha = Math.min(Math.max(alpha, 0.05), 0.8); // Clamp alpha

    if (value > 0) ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`; // Green
    else ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`; // Red

    ctx.fill();

    // Border for triangle
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.stroke();
}

function drawIcon(char, px, py, size) {
    ctx.font = `${size * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(char, px + size / 2, py + size / 2);
}
