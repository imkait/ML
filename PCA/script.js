/**
 * PCA 互動教學核心邏輯
 */

// ===========================
// 全域設定與狀態
// ===========================
const CONFIG = {
    CANVAS_SIZE: 500,
    POINT_COUNT: 100,
    POINT_RADIUS: 4,
    AXIS_LENGTH: 200,
};

let state = {
    // Data Parameters
    correlation: 0.8,
    noise: 20,

    // Data
    points: [], // Array of {x, y} (centered)
    meanX: 0,
    meanY: 0,

    // PCA Results
    pc1Vector: { x: 1, y: 0 },
    pc2Vector: { x: 0, y: 1 },
    eigenvalues: [0, 0], // val1, val2
    pc1Angle: 0, // Angle of PC1 in degrees

    // User Interaction
    userAngle: 0, // Degrees, 0 is horizontal
    showProjections: true,
    showErrors: true,
    showPC: false,

    // Animation
    isAnimating: false,
    targetAngle: 0
};

// ===========================
// 數據生成類別
// ===========================
class DataGenerator {
    static generate(count, correlation, noise) {
        // 1. Create 2D Gaussian Blob aligned to axis
        // Correlation 0.0 -> Circle (x, y independent)
        // Correlation 1.0 -> Line (y = x or y = -x)

        // Strategy: Generate on X-axis with spread, then rotate.
        // Or: Use Cholesky decomposition or simple rotation.

        // Let's us simple rotation method for intuitive shape control.
        // Base width (variance X) is high. Height (variance Y) depends on correlation.

        // Inverse correlation to spread. Higher Corr -> Lower Y Spread.
        const spreadX = 150; // Main axis length
        // If corr is 1, spreadY is small (noise only). If corr is 0, spreadY = spreadX.
        // Let's map corr (0-1) to aspect ratio.
        const aspectRatio = 1 - (correlation * 0.9); // Min 0.1 ratio
        const spreadY = spreadX * aspectRatio;

        const rotation = Math.PI / 4; // Rotate 45 deg to look 'correlated'

        const points = [];
        let sumX = 0, sumY = 0;

        for (let i = 0; i < count; i++) {
            // Standard Normal
            const u1 = Math.random();
            const u2 = Math.random();
            const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            const z2 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);

            // X is main variation, Y is secondary
            let x = z1 * spreadX;
            let y = z2 * spreadY;

            // Add extra noise if requested (isotropic)
            x += (Math.random() - 0.5) * noise * 2;
            y += (Math.random() - 0.5) * noise * 2;

            // Rotate
            const rx = x * Math.cos(rotation) - y * Math.sin(rotation);
            const ry = x * Math.sin(rotation) + y * Math.cos(rotation);

            points.push({ x: rx, y: ry });
            sumX += rx;
            sumY += ry;
        }

        // Center the data (Mean = 0)
        state.meanX = sumX / count;
        state.meanY = sumY / count;

        state.points = points.map(p => ({
            x: p.x - state.meanX,
            y: p.y - state.meanY
        }));
    }
}

// ===========================
// PCA 計算 (2x2 Matrix)
// ===========================
function computePCA() {
    // 1. Compute Covariance Matrix
    // Cov(X,Y) = E[(X-muX)(Y-muY)]
    // Since we centered, Cov(X,Y) = Sum(xy) / (N-1)

    let sumXX = 0, sumYY = 0, sumXY = 0;
    const n = state.points.length;

    for (const p of state.points) {
        sumXX += p.x * p.x;
        sumYY += p.y * p.y;
        sumXY += p.x * p.y;
    }

    const covXX = sumXX / (n - 1);
    const covYY = sumYY / (n - 1);
    const covXY = sumXY / (n - 1);

    // Matrix:
    // [ a  b ]
    // [ b  d ]
    // a=covXX, b=covXY, d=covYY
    // Char eq: (a-L)(d-L) - b^2 = 0
    // L^2 - (a+d)L + (ad-b^2) = 0
    // Quadratic formula for eigenvalues L:
    // L = [(a+d) +/- sqrt((a+d)^2 - 4(ad-b^2))] / 2

    const a = covXX;
    const b = covXY;
    const d = covYY;

    const trace = a + d;
    const det = a * d - b * b;

    const term = Math.sqrt(trace * trace - 4 * det);
    const L1 = (trace + term) / 2;
    const L2 = (trace - term) / 2;

    state.eigenvalues = [L1, L2];

    // Eigenvectors
    // For L1: (a-L1)x + by = 0  =>  by = -(a-L1)x
    // if b != 0: y = -(a-L1)/b * x
    // vector (1, -(a-L1)/b). Normalize it.

    // Handle special case b approx 0 (uncorrelated)
    // If b=0, vectors are axis aligned.

    if (Math.abs(b) < 1e-6) {
        state.pc1Vector = a > d ? { x: 1, y: 0 } : { x: 0, y: 1 };
        state.pc2Vector = a > d ? { x: 0, y: 1 } : { x: 1, y: 0 };
    } else {
        const v1x = 1;
        const v1y = (L1 - a) / b;
        const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
        state.pc1Vector = { x: v1x / len1, y: v1y / len1 };

        // PC2 is orthogonal
        state.pc2Vector = { x: -state.pc1Vector.y, y: state.pc1Vector.x };
    }

    // Calculate PC1 Angle (Degrees)
    // atan2(y, x) gives radians
    let angleRad = Math.atan2(state.pc1Vector.y, state.pc1Vector.x);
    let angleDeg = angleRad * 180 / Math.PI;

    // Normalize to 0-180 for slider consistency if possible
    // PCA vector direction is ambiguous (v and -v are same line)
    if (angleDeg < 0) angleDeg += 180;

    state.pc1Angle = angleDeg;

    // Update Max Variance Display
    document.getElementById('valMaxVariance').textContent = Math.round(L1);
}

// ===========================
// 主程式與互動
// ===========================
const canvas = document.getElementById('pcaCanvas');
const ctx = canvas.getContext('2d');

let animationFrameId;

document.addEventListener('DOMContentLoaded', () => {
    initCanvas(); // DPI
    initControls();
    regenerateData();
    render();
});

function initCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const size = CONFIG.CANVAS_SIZE;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);
}

function initControls() {
    // Generate
    const corrScale = document.getElementById('corrSlider');
    const noiseScale = document.getElementById('noiseSlider');
    const corrDisp = document.getElementById('corrValue');
    const noiseDisp = document.getElementById('noiseValue');

    const updateGenParams = () => {
        state.correlation = parseInt(corrScale.value) / 100;
        state.noise = parseInt(noiseScale.value);
        corrDisp.textContent = state.correlation.toFixed(2);
        noiseDisp.textContent = state.noise;
    };

    corrScale.addEventListener('input', updateGenParams);
    noiseScale.addEventListener('input', updateGenParams);

    document.getElementById('btnRegenerate').addEventListener('click', () => {
        updateGenParams();
        regenerateData();
        render();
    });

    // Projection
    const angleSlider = document.getElementById('angleSlider');
    const angleDisp = document.getElementById('angleValue');

    angleSlider.addEventListener('input', (e) => {
        state.userAngle = parseFloat(e.target.value);
        angleDisp.textContent = state.userAngle + '°';
        state.isAnimating = false; // Stop animation if user interacts
        render();
    });

    // Toggles
    document.getElementById('showPC').addEventListener('change', (e) => {
        state.showPC = e.target.checked;
        render();
    });
    document.getElementById('showProjections').addEventListener('change', (e) => {
        state.showProjections = e.target.checked;
        render();
    });
    document.getElementById('showErrors').addEventListener('change', (e) => {
        state.showErrors = e.target.checked;
        render();
    });

    // Optimize
    document.getElementById('btnOptimize').addEventListener('click', startOptimizeAnimation);
}

function regenerateData() {
    DataGenerator.generate(CONFIG.POINT_COUNT, state.correlation, state.noise);
    computePCA();
}

// ===========================
// Animation Loop
// ===========================
function startOptimizeAnimation() {
    if (state.isAnimating) return;

    // Determine shortest path to PC1 angle
    let current = state.userAngle % 180;
    let target = state.pc1Angle % 180;

    // Fix wrap around 0/180
    // E.g. current 170, target 10 -> go +20 to 190 (mod 180 = 10)
    let diff = target - current;
    if (diff > 90) diff -= 180;
    if (diff < -90) diff += 180;

    state.targetAngle = current + diff;
    state.isAnimating = true;
    animate();
}

function animate() {
    if (!state.isAnimating) return;

    // Simple Lerp
    // let current = state.userAngle;
    // let dist = state.targetAngle - current;

    // Use the slider value as source of truth to handle wrap logic simpler
    // Actually let's just use internal state and update slider

    const speed = 0.1;
    state.userAngle = lerp(state.userAngle, state.targetAngle, speed);

    // Update Slider UI
    let displayAngle = Math.round(state.userAngle);
    // Normalize for display (0-180)
    while (displayAngle < 0) displayAngle += 180;
    while (displayAngle >= 180) displayAngle -= 180;

    const slider = document.getElementById('angleSlider');
    slider.value = displayAngle;
    document.getElementById('angleValue').textContent = displayAngle + '°';

    if (Math.abs(state.userAngle - state.targetAngle) < 0.5) {
        state.userAngle = state.targetAngle;
        state.isAnimating = false;
        slider.value = Math.round(displayAngle); // snap final
    }

    render();
    if (state.isAnimating) requestAnimationFrame(animate);
}

function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
}

// ===========================
// Render
// ===========================
function render() {
    const size = CONFIG.CANVAS_SIZE;
    const center = size / 2;

    ctx.clearRect(0, 0, size, size);

    // 1. Calculate user axis vector
    // Convert deg to rad
    const angleRad = state.userAngle * Math.PI / 180;
    const ux = Math.cos(angleRad);
    const uy = Math.sin(angleRad);

    // 2. Compute Variance on this axis
    let currentVar = 0;
    // Var = Sum( (p dot u)^2 ) / (N-1) since mean is 0
    // Actually we just need Sum(d^2) / (N-1) where d is projection length

    let sumSqProj = 0;

    state.points.forEach(p => {
        const projection = p.x * ux + p.y * uy; // Dot product
        sumSqProj += projection * projection;
    });

    currentVar = sumSqProj / (state.points.length - 1);

    // Update Stats
    document.getElementById('valVariance').textContent = Math.round(currentVar);

    // Explained Ratio
    const totalVar = state.eigenvalues[0] + state.eigenvalues[1];
    const ratio = (currentVar / totalVar) * 100;
    document.getElementById('valExplained').textContent = ratio.toFixed(1) + '%';

    // Dynamic color for "Optimization"
    // Calculate ratio of current to max
    const maxVar = state.eigenvalues[0];
    const performance = currentVar / maxVar; // 0 to 1

    // 3. Draw Grid (Optional, faint)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, center); ctx.lineTo(size, center);
    ctx.moveTo(center, 0); ctx.lineTo(center, size);
    ctx.stroke();

    // 4. Draw User Axis
    // Extend line far
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.moveTo(center - ux * 1000, center - uy * 1000);
    ctx.lineTo(center + ux * 1000, center + uy * 1000);
    ctx.stroke();

    // 5. Draw Projections & Errors
    if (state.showProjections || state.showErrors) {
        state.points.forEach(p => {
            // Screen coords
            const sx = center + p.x;
            const sy = center + p.y;

            // Project
            const val = p.x * ux + p.y * uy;
            const px = center + val * ux;
            const py = center + val * uy;

            // Error Line
            if (state.showErrors) {
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(244, 114, 182, 0.4)'; // Pink Accent
                ctx.lineWidth = 1;
                ctx.moveTo(sx, sy);
                ctx.lineTo(px, py);
                ctx.stroke();
            }

            // Projection Point
            if (state.showProjections) {
                ctx.beginPath();
                ctx.fillStyle = performance > 0.99 ? '#22c55e' : '#f59e0b'; // Green if optimal, else Amber
                ctx.arc(px, py, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    // 6. Draw Data Points
    ctx.fillStyle = '#06b6d4'; // Cyan primary
    state.points.forEach(p => {
        const sx = center + p.x;
        const sy = center + p.y;

        ctx.beginPath();
        // Scale opacity by distance from center? No, just flat.
        ctx.arc(sx, sy, CONFIG.POINT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
    });

    // 7. Draw True PC Axis (if toggle on)
    if (state.showPC) {
        drawVector(center, center, state.pc1Vector.x, state.pc1Vector.y, 150, '#22c55e', 'PC1');
        drawVector(center, center, state.pc2Vector.x, state.pc2Vector.y, 80, '#f472b6', 'PC2');
    }
}

function drawVector(cx, cy, vx, vy, length, color, label) {
    const endX = cx + vx * length;
    const endY = cy + vy * length;

    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.moveTo(cx, cy);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Arrow head
    const headLen = 10;
    const angle = Math.atan2(vy, vx);
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6), endY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6), endY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.fillStyle = color;
    ctx.fill();

    if (label) {
        ctx.fillStyle = 'white';
        ctx.font = '12px sans-serif';
        ctx.fillText(label, endX + 10, endY + 10);
    }
}
