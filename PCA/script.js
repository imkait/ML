/**
 * 3D PCA 互動教學核心邏輯 (使用 Three.js)
 * 高雄市立楠梓高中互動式機器學習教學平台
 */

// ==========================================
// 1. 全域設定與狀態
// ==========================================
const CONFIG = {
    POINT_RADIUS: 4,
    AXIS_SCALE: 80, // 主成分軸長度縮放比例
    PLANE_SIZE: 120, // 投影平面的半寬高
};

let state = {
    // 數據生成參數
    distribution: 'pancake', // cigar, pancake, spherical, helix
    pointCount: 150,
    noise: 15,

    // PCA 運算結果
    points: [], // 陣列，儲存點的原始、投影與當前動態位置
    eigenvalues: [0, 0, 0], // 特徵值 (PC1, PC2, PC3)
    eigenvectors: [], // 特徵向量 [{x,y,z}, {x,y,z}, {x,y,z}]
    explainedRatios: [0, 0, 0], // 解釋變異數比例

    // 互動狀態
    targetState: '3D', // 當前投影目標狀態：'3D', '2D', '1D'
    showPCAxes: true,
    showPCPlane: true,
    showProjections: true,
    showErrors: true,

    // 動態過渡速度
    transitionSpeed: 0.08
};

// ==========================================
// 2. Three.js 場景變數
// ==========================================
let scene, camera, renderer, controls;
let pointsMesh;          // 原始數據點 (3D 空間點雲)
let projectedPointsMesh; // 投影後的靜態點雲 (幫助對比)
let errorLinesMesh;      // 連接原始點與投影點的誤差線 (LineSegments)
let pcArrows = [];       // PC1, PC2, PC3 的 ArrowHelper
let projectionPlaneMesh; // PC1-PC2 半透明投影平面
let planeGridMesh;       // 投影平面上的網格線
let centerDot;           // 中心點 (均值中心)

// ==========================================
// 3. 3x3 矩陣特徵值求解器 (Jacobi 演算法)
// ==========================================
/**
 * 求解 3x3 對稱共變異數矩陣的特徵值與特徵向量 (Jacobi 旋轉法)
 * 適合瀏覽器端直接執行，不需外部數學庫，且收斂極快。
 */
function eigenSolve3x3(cov) {
    // 初始化 A 矩陣為共變異數矩陣副本
    let A = [
        [cov[0][0], cov[0][1], cov[0][2]],
        [cov[1][0], cov[1][1], cov[1][2]],
        [cov[2][0], cov[2][1], cov[2][2]]
    ];
    // 初始化 V 矩陣為單位矩陣 (存放特徵向量)
    let V = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
    ];

    const maxIterations = 50;
    const eps = 1e-6; // 收斂門檻

    for (let iter = 0; iter < maxIterations; iter++) {
        // 1. 尋找非對角線上絕對值最大的元素 A[p][q]
        let p = 0, q = 1;
        let maxVal = Math.abs(A[0][1]);
        if (Math.abs(A[0][2]) > maxVal) {
            p = 0; q = 2;
            maxVal = Math.abs(A[0][2]);
        }
        if (Math.abs(A[1][2]) > maxVal) {
            p = 1; q = 2;
            maxVal = Math.abs(A[1][2]);
        }

        // 若最大非對角元素已小於極小值，代表已完全對角化，提早結束
        if (maxVal < eps) break;

        // 2. 計算 Jacobi 旋轉角 theta (用代數優化避免三角函數直接運算)
        let diff = A[q][q] - A[p][p];
        if (Math.abs(A[p][q]) < 1e-12) continue;

        let tau = diff / (2 * A[p][q]);
        let t;
        if (tau >= 0) {
            t = 1.0 / (tau + Math.sqrt(1.0 + tau * tau));
        } else {
            t = -1.0 / (-tau + Math.sqrt(1.0 + tau * tau));
        }
        let c = 1.0 / Math.sqrt(1.0 + t * t); // cos(theta)
        let s = t * c;                        // sin(theta)

        // 3. 更新 A 矩陣的對角線與非對角線元素 (A = R^T * A * R)
        let app = A[p][p];
        let aqq = A[q][q];
        let apq = A[p][q];

        A[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
        A[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
        A[p][q] = 0;
        A[q][p] = 0;

        for (let i = 0; i < 3; i++) {
            if (i !== p && i !== q) {
                let aip = A[i][p];
                let aiq = A[i][q];
                A[i][p] = c * aip - s * aiq;
                A[p][i] = A[i][p];
                A[i][q] = s * aip + c * aiq;
                A[q][i] = A[i][q];
            }
        }

        // 4. 更新特徵向量矩陣 V (V = V * R)
        for (let i = 0; i < 3; i++) {
            let vip = V[i][p];
            let viq = V[i][q];
            V[i][p] = c * vip - s * viq;
            V[i][q] = s * vip + c * viq;
        }
    }

    // 提取特徵值與特徵向量 (V 的每一行即為特徵向量)
    let eigenvalues = [A[0][0], A[1][1], A[2][2]];
    let eigenvectors = [
        { x: V[0][0], y: V[1][0], z: V[2][0] },
        { x: V[0][1], y: V[1][1], z: V[2][1] },
        { x: V[0][2], y: V[1][2], z: V[2][2] }
    ];

    // 按照特徵值大小降序排序 (PC1 > PC2 > PC3)
    let indices = [0, 1, 2];
    indices.sort((a, b) => eigenvalues[b] - eigenvalues[a]);

    return {
        eigenvalues: indices.map(i => Math.max(0, eigenvalues[i])), // 避免極小負數誤差
        eigenvectors: indices.map(i => {
            let vec = eigenvectors[i];
            let len = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
            return { x: vec.x / len, y: vec.y / len, z: vec.z / len };
        })
    };
}

// ==========================================
// 4. 3D 數據生成器
// ==========================================
class DataGenerator {
    static generate(count, type, noise) {
        const rawPoints = [];

        // Box-Muller 變換：生成標準常態分佈隨機數
        const randn = () => {
            let u = 0, v = 0;
            while (u === 0) u = Math.random();
            while (v === 0) v = Math.random();
            return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        };

        // 3D 旋轉變換 (使生成的點雲不與預設的 XYZ 軸平行，展示 PCA 的尋軸能力)
        const cosX = Math.cos(0.5);
        const sinX = Math.sin(0.5);
        const cosY = Math.cos(0.6);
        const sinY = Math.sin(0.6);
        const cosZ = Math.cos(0.4);
        const sinZ = Math.sin(0.4);

        const rotate3D = (x, y, z) => {
            // Y軸旋轉
            let x1 = x * cosY - z * sinY;
            let z1 = x * sinY + z * cosY;
            // X軸旋轉
            let y2 = y * cosX - z1 * sinX;
            let z2 = y * sinX + z1 * cosX;
            // Z軸旋轉
            let x3 = x1 * cosZ - y2 * sinZ;
            let y3 = x1 * sinZ + y2 * cosZ;
            return { x: x3, y: y3, z: z2 };
        };

        for (let i = 0; i < count; i++) {
            let x = 0, y = 0, z = 0;

            if (type === 'cigar') {
                // 線狀拉長 (Cigar-shaped)：PC1 佔絕對優勢
                x = randn() * 70;
                y = randn() * 12;
                z = randn() * 12;
            } else if (type === 'pancake') {
                // 扁平盤狀 (Pancake-shaped)：PC1 & PC2 大，PC3 扁
                x = randn() * 60;
                y = randn() * 45;
                z = randn() * 10;
            } else if (type === 'spherical') {
                // 球狀均勻 (Spherical)：三個方向特徵值相近，無明顯主成分
                x = randn() * 45;
                y = randn() * 45;
                z = randn() * 45;
            } else if (type === 'helix') {
                // 3D 螺旋線 (Helix)：非線性分佈，用來挑戰線性 PCA 的侷限性
                const t = (i / count) * 4.5 * Math.PI; // 繞 2.25 圈
                x = 50 * Math.cos(t);
                y = 50 * Math.sin(t);
                z = (i / count) * 100 - 50; // 沿Z軸上升
            }

            // 疊加各向同性的雜訊大小
            x += randn() * noise;
            y += randn() * noise;
            z += randn() * noise;

            // 進行 3D 傾斜旋轉
            const rotated = rotate3D(x, y, z);
            rawPoints.push(rotated);
        }

        // 中心化數據 (去均值化，使重心為原點 0,0,0)
        let sumX = 0, sumY = 0, sumZ = 0;
        rawPoints.forEach(p => {
            sumX += p.x;
            sumY += p.y;
            sumZ += p.z;
        });

        const meanX = sumX / count;
        const meanY = sumY / count;
        const meanZ = sumZ / count;

        return rawPoints.map(p => ({
            x: p.x - meanX,
            y: p.y - meanY,
            z: p.z - meanZ
        }));
    }
}

// ==========================================
// 5. 初始化 WebGL 3D 場景
// ==========================================
function initThree() {
    const container = document.getElementById('canvasContainer');
    const width = container.clientWidth;
    const height = container.clientHeight || 500;

    // 1. Scene 與背景設定
    scene = new THREE.Scene();
    scene.background = null; // 透明背景，使用 CSS 漸層色

    // 2. Camera 透視相機
    camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    camera.position.set(130, 110, 180);

    // 3. Renderer 渲染器
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 4. OrbitControls 視角控制器
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 400;
    controls.minDistance = 30;

    // 5. 光源設定 (雖然粒子不需要太多光，但能照亮投影面與輔助軸)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 100, 50);
    scene.add(dirLight);

    // 6. 視窗尺寸適應 (RWD)
    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    const container = document.getElementById('canvasContainer');
    const width = container.clientWidth;
    const height = container.clientHeight || 500;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

// ==========================================
// 6. 粒子發光材質貼圖
// ==========================================
/**
 * 用 HTML5 Canvas 動態生成一個發光漸層粒子，避免外部圖片載入失敗
 */
function createGlowTexture(colorHexStr) {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.2, colorHexStr); // 霓虹主色
    grad.addColorStop(0.5, 'rgba(6, 182, 212, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    return new THREE.CanvasTexture(canvas);
}

// ==========================================
// 7. PCA 核心計算與場景更新
// ==========================================
function updatePCA() {
    // 1. 生成 3D 原始點
    const rawPoints = DataGenerator.generate(state.pointCount, state.distribution, state.noise);

    // 2. 計算 3x3 共變異數矩陣
    let cov = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
    ];
    for (const p of rawPoints) {
        cov[0][0] += p.x * p.x;
        cov[0][1] += p.x * p.y;
        cov[0][2] += p.x * p.z;

        cov[1][0] += p.y * p.x;
        cov[1][1] += p.y * p.y;
        cov[1][2] += p.y * p.z;

        cov[2][0] += p.z * p.x;
        cov[2][1] += p.z * p.y;
        cov[2][2] += p.z * p.z;
    }
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            cov[i][j] /= (state.pointCount - 1);
        }
    }

    // 3. 求解特徵向量與特徵值
    const result = eigenSolve3x3(cov);
    state.eigenvalues = result.eigenvalues;
    state.eigenvectors = result.eigenvectors;

    // 4. 計算解釋變異數比例
    const totalVariance = state.eigenvalues[0] + state.eigenvalues[1] + state.eigenvalues[2];
    state.explainedRatios = state.eigenvalues.map(val => totalVariance > 0 ? val / totalVariance : 0);

    // 5. 更新統計 UI 顯示 (繁體中文)
    document.getElementById('valPC1').textContent = (state.explainedRatios[0] * 100).toFixed(1) + '%';
    document.getElementById('valPC2').textContent = (state.explainedRatios[1] * 100).toFixed(1) + '%';
    document.getElementById('valPC3').textContent = (state.explainedRatios[2] * 100).toFixed(1) + '%';
    document.getElementById('eigenPC1').textContent = `特徵值: ${state.eigenvalues[0].toFixed(1)}`;
    document.getElementById('eigenPC2').textContent = `特徵值: ${state.eigenvalues[1].toFixed(1)}`;
    document.getElementById('eigenPC3').textContent = `特徵值: ${state.eigenvalues[2].toFixed(1)}`;

    // 6. 計算每個點對應的 2D 投影點與 1D 投影點
    const v1 = state.eigenvectors[0];
    const v2 = state.eigenvectors[1];

    state.points = rawPoints.map((p, index) => {
        // Dot products (投影長度)
        const proj1 = p.x * v1.x + p.y * v1.y + p.z * v1.z;
        const proj2 = p.x * v2.x + p.y * v2.y + p.z * v2.z;

        // 2D 投影點座標：位於 PC1-PC2 平面
        const p2d = {
            x: proj1 * v1.x + proj2 * v2.x,
            y: proj1 * v1.y + proj2 * v2.y,
            z: proj1 * v1.z + proj2 * v2.z
        };

        // 1D 投影點座標：位於 PC1 軸上
        const p1d = {
            x: proj1 * v1.x,
            y: proj1 * v1.y,
            z: proj1 * v1.z
        };

        // 繼承上一次的當前渲染位置，以達到流暢動畫過渡
        const prev = state.points[index];
        const current = prev ? { ...prev.current } : { ...p };

        return {
            orig: p,
            proj2D: p2d,
            proj1D: p1d,
            current: current
        };
    });

    // 7. 更新 3D 場景中的輔助線與平面
    updateHelpers();
}

// ==========================================
// 8. 建立與更新 3D 輔助元素
// ==========================================
function updateHelpers() {
    // 清除舊的輔助元素
    pcArrows.forEach(arrow => scene.remove(arrow));
    pcArrows = [];

    if (projectionPlaneMesh) scene.remove(projectionPlaneMesh);
    if (planeGridMesh) scene.remove(planeGridMesh);
    if (centerDot) scene.remove(centerDot);

    const v1 = state.eigenvectors[0];
    const v2 = state.eigenvectors[1];
    const v3 = state.eigenvectors[2];

    // (A) 繪製重心中心點
    const centerGeom = new THREE.SphereGeometry(1.2, 16, 16);
    const centerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    centerDot = new THREE.Mesh(centerGeom, centerMat);
    scene.add(centerDot);

    // (B) 繪製三個主成分方向軸 (ArrowHelper)
    if (state.showPCAxes) {
        const origin = new THREE.Vector3(0, 0, 0);

        // PC1: 綠色 (最長)
        const len1 = Math.sqrt(state.eigenvalues[0]) * 3.5;
        const dir1 = new THREE.Vector3(v1.x, v1.y, v1.z).normalize();
        const arrow1 = new THREE.ArrowHelper(dir1, origin, len1, 0x22c55e, 8, 4);
        scene.add(arrow1);
        pcArrows.push(arrow1);

        // PC2: 藍色
        const len2 = Math.sqrt(state.eigenvalues[1]) * 3.5;
        const dir2 = new THREE.Vector3(v2.x, v2.y, v2.z).normalize();
        const arrow2 = new THREE.ArrowHelper(dir2, origin, len2, 0x06b6d4, 8, 4);
        scene.add(arrow2);
        pcArrows.push(arrow2);

        // PC3: 紅色/粉色
        const len3 = Math.sqrt(state.eigenvalues[2]) * 3.5;
        const dir3 = new THREE.Vector3(v3.x, v3.y, v3.z).normalize();
        const arrow3 = new THREE.ArrowHelper(dir3, origin, len3, 0xf472b6, 8, 4);
        scene.add(arrow3);
        pcArrows.push(arrow3);
    }

    // (C) 繪製 PC1-PC2 透明投影平面 (用頂點基底精確構造)
    if (state.showPCPlane) {
        const w = CONFIG.PLANE_SIZE;
        const h = CONFIG.PLANE_SIZE;

        const planeGeom = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            // 三角形 1
            -w * v1.x - h * v2.x, -w * v1.y - h * v2.y, -w * v1.z - h * v2.z,
             w * v1.x - h * v2.x,  w * v1.y - h * v2.y,  w * v1.z - h * v2.z,
             w * v1.x + h * v2.x,  w * v1.y + h * v2.y,  w * v1.z + h * v2.z,
            // 三角形 2
            -w * v1.x - h * v2.x, -w * v1.y - h * v2.y, -w * v1.z - h * v2.z,
             w * v1.x + h * v2.x,  w * v1.y + h * v2.y,  w * v1.z + h * v2.z,
            -w * v1.x + h * v2.x, -w * v1.y + h * v2.y, -w * v1.z + h * v2.z
        ]);
        planeGeom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        planeGeom.computeVertexNormals();

        const planeMat = new THREE.MeshBasicMaterial({
            color: 0x1e293b,
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        projectionPlaneMesh = new THREE.Mesh(planeGeom, planeMat);
        scene.add(projectionPlaneMesh);

        // (D) 繪製投影平面上的細部對齊網格線
        const gridPositions = [];
        const step = 20;
        const limit = CONFIG.PLANE_SIZE;

        // 平行於 PC1 軸的格線
        for (let i = -limit; i <= limit; i += step) {
            gridPositions.push(
                -limit * v1.x + i * v2.x, -limit * v1.y + i * v2.y, -limit * v1.z + i * v2.z,
                 limit * v1.x + i * v2.x,  limit * v1.y + i * v2.y,  limit * v1.z + i * v2.z
            );
        }
        // 平行於 PC2 軸的格線
        for (let i = -limit; i <= limit; i += step) {
            gridPositions.push(
                i * v1.x - limit * v2.x, i * v1.y - limit * v2.y, i * v1.z - limit * v2.z,
                i * v1.x + limit * v2.x, i * v1.y + limit * v2.y, i * v1.z + limit * v2.z
            );
        }

        const gridGeom = new THREE.BufferGeometry();
        gridGeom.setAttribute('position', new THREE.Float32BufferAttribute(gridPositions, 3));
        const gridMat = new THREE.LineBasicMaterial({
            color: 0x06b6d4,
            transparent: true,
            opacity: 0.15
        });
        planeGridMesh = new THREE.LineSegments(gridGeom, gridMat);
        scene.add(planeGridMesh);
    }
}

// ==========================================
// 9. 建構點雲及誤差線 Buffer 容器
// ==========================================
function setupRenderObjects() {
    // 移除舊的
    if (pointsMesh) scene.remove(pointsMesh);
    if (projectedPointsMesh) scene.remove(projectedPointsMesh);
    if (errorLinesMesh) scene.remove(errorLinesMesh);

    const count = state.pointCount;

    // (A) 原始點雲 Mesh
    const pointsGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    pointsGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const pointsMat = new THREE.PointsMaterial({
        size: 5.5,
        map: createGlowTexture('rgba(6, 182, 212, 0.9)'), // 青色發光粒子
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    pointsMesh = new THREE.Points(pointsGeom, pointsMat);
    scene.add(pointsMesh);

    // (B) 靜態對齊的投影點雲 (黃色，做為背景參考)
    const projGeom = new THREE.BufferGeometry();
    const projPositions = new Float32Array(count * 3);
    projGeom.setAttribute('position', new THREE.BufferAttribute(projPositions, 3));

    const projMat = new THREE.PointsMaterial({
        size: 4.0,
        map: createGlowTexture('rgba(234, 179, 8, 0.7)'), // 黃色發光粒子
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    projectedPointsMesh = new THREE.Points(projGeom, projMat);
    scene.add(projectedPointsMesh);

    // (C) 誤差連線 (LineSegments)
    const lineGeom = new THREE.BufferGeometry();
    const linePositions = new Float32Array(count * 2 * 3); // 每個點有起終點
    lineGeom.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

    const lineMat = new THREE.LineBasicMaterial({
        color: 0xf472b6, // 粉紅色誤差線
        transparent: true,
        opacity: 0.35
    });
    errorLinesMesh = new THREE.LineSegments(lineGeom, lineMat);
    scene.add(errorLinesMesh);
}

// ==========================================
// 10. UI 控制元件與事件監聽
// ==========================================
function initControls() {
    // (A) 數據分佈下拉選單
    const distSelect = document.getElementById('distSelect');
    distSelect.addEventListener('change', (e) => {
        state.distribution = e.target.value;
        regenerateData();
    });

    // (B) 點數量滑桿
    const countSlider = document.getElementById('pointCountSlider');
    const countVal = document.getElementById('pointCountValue');
    countSlider.addEventListener('input', (e) => {
        state.pointCount = parseInt(e.target.value);
        countVal.textContent = state.pointCount;
    });

    // (C) 雜訊滑桿
    const noiseSlider = document.getElementById('noiseSlider');
    const noiseVal = document.getElementById('noiseValue');
    noiseSlider.addEventListener('input', (e) => {
        state.noise = parseInt(e.target.value);
        noiseVal.textContent = state.noise;
    });

    // (D) 重新生成按鈕
    document.getElementById('btnRegenerate').addEventListener('click', () => {
        regenerateData();
    });

    // (E) 投影狀態切換按鈕組 (Tab Button Group)
    const btn3D = document.getElementById('btnState3D');
    const btn2D = document.getElementById('btnState2D');
    const btn1D = document.getElementById('btnState1D');
    const tabs = [btn3D, btn2D, btn1D];

    const setTabActive = (activeTab, stateStr) => {
        tabs.forEach(t => t.classList.remove('active'));
        activeTab.classList.add('active');
        state.targetState = stateStr;
    };

    btn3D.addEventListener('click', () => setTabActive(btn3D, '3D'));
    btn2D.addEventListener('click', () => setTabActive(btn2D, '2D'));
    btn1D.addEventListener('click', () => setTabActive(btn1D, '1D'));

    // (F) 顯示開關切換器
    document.getElementById('showPCAxes').addEventListener('change', (e) => {
        state.showPCAxes = e.target.checked;
        updateHelpers();
    });
    document.getElementById('showPCPlane').addEventListener('change', (e) => {
        state.showPCPlane = e.target.checked;
        updateHelpers();
    });
    document.getElementById('showProjections').addEventListener('change', (e) => {
        state.showProjections = e.target.checked;
    });
    document.getElementById('showErrors').addEventListener('change', (e) => {
        state.showErrors = e.target.checked;
    });
}

function regenerateData() {
    updatePCA();
    setupRenderObjects();
}

// ==========================================
// 11. 核心動畫渲染迴圈 (Lerp 過渡)
// ==========================================
function animate() {
    requestAnimationFrame(animate);

    // 1. 更新 OrbitControls 視角阻尼
    if (controls) controls.update();

    // 2. 決定當前點的目標投影座標
    const count = state.pointCount;
    for (let i = 0; i < count; i++) {
        const pt = state.points[i];
        if (!pt) continue;

        let target;
        if (state.targetState === '2D') {
            target = pt.proj2D;
        } else if (state.targetState === '1D') {
            target = pt.proj1D;
        } else {
            target = pt.orig;
        }

        // 用 Lerp (線性插值) 對每個點的座標進行平滑移動，模擬「壓扁降維」動畫
        pt.current.x += (target.x - pt.current.x) * state.transitionSpeed;
        pt.current.y += (target.y - pt.current.y) * state.transitionSpeed;
        pt.current.z += (target.z - pt.current.z) * state.transitionSpeed;
    }

    // 3. 更新 BufferGeometry 頂點座標陣列
    if (pointsMesh && state.points.length === count) {
        const positions = pointsMesh.geometry.attributes.position.array;
        const projPositions = projectedPointsMesh.geometry.attributes.position.array;
        const linePositions = errorLinesMesh.geometry.attributes.position.array;

        for (let i = 0; i < count; i++) {
            const pt = state.points[i];
            const idx = i * 3;

            // (A) 原始移動點雲
            positions[idx] = pt.current.x;
            positions[idx + 1] = pt.current.y;
            positions[idx + 2] = pt.current.z;

            // (B) 靜態投影參考點 (依據選擇狀態決定，若在 1D 目標，投影點是 1D；否則是 2D)
            const refProj = (state.targetState === '1D') ? pt.proj1D : pt.proj2D;
            projPositions[idx] = refProj.x;
            projPositions[idx + 1] = refProj.y;
            projPositions[idx + 2] = refProj.z;

            // (C) 重建誤差線的起點與終點 (LineSegments 每個線段有兩個點)
            const lineIdx = i * 6;
            // 起點為「粒子當前渲染位置」
            linePositions[lineIdx] = pt.current.x;
            linePositions[lineIdx + 1] = pt.current.y;
            linePositions[lineIdx + 2] = pt.current.z;
            // 終點為「對應的投影面位置」
            linePositions[lineIdx + 3] = refProj.x;
            linePositions[lineIdx + 4] = refProj.y;
            linePositions[lineIdx + 5] = refProj.z;
        }

        pointsMesh.geometry.attributes.position.needsUpdate = true;
        projectedPointsMesh.geometry.attributes.position.needsUpdate = true;
        errorLinesMesh.geometry.attributes.position.needsUpdate = true;

        // (D) 控制元件的顯示隱藏切換
        projectedPointsMesh.visible = state.showProjections && (state.targetState === '3D'); // 降維後投影點與原始點重合，隱藏避免重疊
        errorLinesMesh.visible = state.showErrors && (state.targetState !== '1D' && state.targetState !== '2D'); // 降維完全貼合後，隱藏誤差線
    }

    // 4. WebGL 渲染
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// ==========================================
// 12. 入口啟動點
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. 初始化 3D WebGL
    initThree();

    // 2. 初始化控制面板監聽
    initControls();

    // 3. 首度生成數據與 PCA
    regenerateData();

    // 4. 啟動動畫迴圈
    animate();
});

