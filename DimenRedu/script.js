// ===========================
// 資料降維互動教學 JavaScript
// 實作 PCA、t-SNE（簡化版）、LDA 演算法
// 搭配 Canvas 視覺化
// ===========================

// ===========================
// 資料集定義
// ===========================

/**
 * DATASETS 包含三組模擬資料
 * 每筆資料有多個特徵（高維），以及對應的類別標籤
 */
const DATASETS = {
    // 鳶尾花資料（模擬 Fisher's Iris）：4 個特徵，3 個類別
    iris: {
        name: '鳶尾花資料',
        description: '模擬 Fisher Iris 資料集，3 種鳶尾花，共 4 個形態特徵',
        features: ['花萼長', '花萼寬', '花瓣長', '花瓣寬'],
        classes: ['山鳶尾', '偽裝鳶尾', '維吉尼亞鳶尾'],
        // 每筆資料格式：[特徵1, 特徵2, 特徵3, 特徵4, 類別索引]
        data: generateIrisData()
    },
    // 手寫數字（極度簡化，用 8×8 = 64 維為例）
    digits: {
        name: '手寫數字資料',
        description: '模擬 8×8 像素手寫數字，每個像素是一個特徵（共 64 維）',
        features: Array.from({ length: 64 }, (_, i) => `像素${i + 1}`),
        classes: ['數字 0', '數字 1', '數字 2', '數字 3'],
        data: generateDigitsData()
    },
    // 學生成績：5 個科目分數
    student: {
        name: '學生成績資料',
        description: '5 個科目成績組成的特徵空間，分為 3 個學習表現群組',
        features: ['數學', '國文', '英文', '自然', '社會'],
        classes: ['優秀', '普通', '待加強'],
        data: generateStudentData()
    }
};

// ===========================
// 顏色設定（與 CSS 一致）
// ===========================

/** 各類別使用的顏色（給 Canvas 繪圖用） */
const CLASS_COLORS = [
    '#60a5fa',  // 藍色
    '#f472b6',  // 粉紅色
    '#4ade80',  // 綠色
    '#fb923c',  // 橘色
];

/** 三種降維方法的主題色 */
const METHOD_COLORS = {
    pca: '#60a5fa',
    tsne: '#f472b6',
    lda: '#a78bfa'
};

// ===========================
// 事件監聽
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('reduceBtn').addEventListener('click', executeReduction);
    document.getElementById('clearBtn').addEventListener('click', clearAll);
});

// ===========================
// 主執行函數
// ===========================

/**
 * 執行降維：讀取選擇的資料集，對 PCA、t-SNE、LDA 分別計算，
 * 並呼叫對應的渲染函式將結果畫到 Canvas
 */
function executeReduction() {
    const key = document.getElementById('datasetSelect').value;
    const dataset = DATASETS[key];

    // ① 顯示資料集基本資訊
    renderDatasetInfo(dataset);

    // ② 取得數值矩陣（去除最後一欄類別索引）
    const X = dataset.data.map(row => row.slice(0, -1));  // 特徵矩陣 (n × d)
    const labels = dataset.data.map(row => row[row.length - 1]);  // 類別標籤陣列

    // ③ 對特徵進行 Z-Score 標準化（PCA 必要步驟）
    const Xnorm = zscore(X);

    // ④ 執行三種降維並繪製結果
    const pcaResult = runPCA(Xnorm, 2);
    renderScatterPlot('pcaCanvas', pcaResult.coords, labels, dataset.classes, METHOD_COLORS.pca, 'PCA');
    document.getElementById('pcaInfo').innerHTML =
        `解釋變異量：第1主成分 <strong>${(pcaResult.varRatio[0] * 100).toFixed(1)}%</strong>，` +
        `第2主成分 <strong>${(pcaResult.varRatio[1] * 100).toFixed(1)}%</strong>` +
        `（合計 ${((pcaResult.varRatio[0] + pcaResult.varRatio[1]) * 100).toFixed(1)}%）`;

    const tsneResult = runTSNE(Xnorm, 2);
    renderScatterPlot('tsneCanvas', tsneResult.coords, labels, dataset.classes, METHOD_COLORS.tsne, 't-SNE');
    document.getElementById('tsneInfo').innerHTML =
        `使用 perplexity=30，迭代 200 次。` +
        `<br><em style="color:var(--text-muted)">注意：座標無絕對意義，只反映相對位置關係</em>`;

    const ldaResult = runLDA(Xnorm, labels, dataset.classes.length);
    renderScatterPlot('ldaCanvas', ldaResult.coords, labels, dataset.classes, METHOD_COLORS.lda, 'LDA');
    document.getElementById('ldaInfo').innerHTML =
        `可分性得分（Fisher 準則）：<strong>${ldaResult.fisherScore.toFixed(3)}</strong>` +
        `<br><em style="color:var(--text-muted)">分數越高代表類別在低維空間中越易分開</em>`;

    // ⑤ 顯示解釋變異量圖
    renderVarianceChart(pcaResult.varRatio);

    // ⑥ 顯示結果區塊
    const resultSection = document.getElementById('resultsSection');
    resultSection.style.display = '';
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // ⑦ 顯示解釋變異量卡片
    document.getElementById('varianceCard').style.display = '';
}

// ===========================
// 資料集資訊渲染
// ===========================
function renderDatasetInfo(dataset) {
    const el = document.getElementById('datasetInfo');
    const n = dataset.data.length;
    const d = dataset.features.length;
    el.innerHTML = `
        <div class="dataset-info-grid">
            <div class="info-chip">
                <span class="chip-label">資料筆數</span>
                <span class="chip-value">${n}</span>
            </div>
            <div class="info-chip">
                <span class="chip-label">原始維度</span>
                <span class="chip-value">${d}</span>
            </div>
            <div class="info-chip">
                <span class="chip-label">降維後</span>
                <span class="chip-value">2D</span>
            </div>
            <div class="info-chip">
                <span class="chip-label">類別數</span>
                <span class="chip-value">${dataset.classes.length}</span>
            </div>
        </div>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.75rem;">${dataset.description}</p>
    `;
}

// ===========================
// 清除函數
// ===========================
function clearAll() {
    document.getElementById('datasetSelect').value = 'iris';
    document.getElementById('datasetInfo').innerHTML =
        '<div class="placeholder-text">👆 選擇資料集後點擊「執行降維」</div>';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('varianceCard').style.display = 'none';
}

// ===========================
// 數學工具函數
// ===========================

/**
 * Z-Score 標準化
 * 讓每個特徵的平均值 = 0、標準差 = 1
 * @param {number[][]} X - 原始資料矩陣 (n×d)
 * @returns {number[][]} 標準化後的矩陣
 */
function zscore(X) {
    const n = X.length;
    const d = X[0].length;

    // 計算每個特徵的均值
    const means = Array(d).fill(0);
    X.forEach(row => row.forEach((v, j) => (means[j] += v)));
    means.forEach((_, j) => (means[j] /= n));

    // 計算每個特徵的標準差
    const stds = Array(d).fill(0);
    X.forEach(row => row.forEach((v, j) => (stds[j] += (v - means[j]) ** 2)));
    stds.forEach((_, j) => (stds[j] = Math.sqrt(stds[j] / n) || 1));

    // 標準化
    return X.map(row => row.map((v, j) => (v - means[j]) / stds[j]));
}

/**
 * 矩陣相乘 A × B
 * @param {number[][]} A - m×k 矩陣
 * @param {number[][]} B - k×n 矩陣
 * @returns {number[][]} m×n 矩陣
 */
function matMul(A, B) {
    const m = A.length, k = A[0].length, nc = B[0].length;
    return Array.from({ length: m }, (_, i) =>
        Array.from({ length: nc }, (_, j) =>
            A[i].reduce((s, _, l) => s + A[i][l] * B[l][j], 0)
        )
    );
}

/**
 * 矩陣轉置
 * @param {number[][]} A - m×n 矩陣
 * @returns {number[][]} n×m 矩陣
 */
function transpose(A) {
    return A[0].map((_, j) => A.map(row => row[j]));
}

/**
 * 向量的 L2 範數（長度）
 */
function norm(v) {
    return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}

/**
 * 向量正規化（除以自身長度）
 */
function normalize(v) {
    const n = norm(v) || 1;
    return v.map(x => x / n);
}

// ===========================
// PCA 主成分分析
// ===========================

/**
 * 使用冪次迭代法（Power Iteration）求共變異矩陣的前 k 個特徵向量
 * （教學用途，較直觀；生產環境建議用奇異值分解 SVD）
 *
 * 步驟：
 * 1. 計算共變異矩陣 Σ = XᵀX / (n-1)
 * 2. 用冪次迭代法找第一個特徵向量（方差最大的方向）
 * 3. 從 X 中移除該方向的投影（deflation），再求第二個
 *
 * @param {number[][]} X - 已標準化的矩陣 (n×d)
 * @param {number} k - 保留主成分數
 * @returns {{ coords: number[][], varRatio: number[] }}
 */
function runPCA(X, k) {
    const n = X.length;
    const Xt = transpose(X);  // d×n

    // ① 計算共變異矩陣 (d×d)
    const cov = matMul(Xt, X).map(row => row.map(v => v / (n - 1)));

    const totalVar = cov.reduce((s, row, i) => s + row[i], 0);  // trace = 總方差

    // ② 用冪次迭代法求前 k 個特徵向量
    const eigenvectors = [];
    const eigenvalues = [];
    let covDeflated = cov.map(row => [...row]);  // 複製，避免修改原始值

    for (let pc = 0; pc < k; pc++) {
        // 冪次迭代：v = cov · v，反覆正規化直到收斂
        let v = Array(cov.length).fill(0).map(() => Math.random() - 0.5);
        for (let iter = 0; iter < 100; iter++) {
            // v_new = covDeflated · v
            const vNew = covDeflated.map(row =>
                row.reduce((s, c, j) => s + c * v[j], 0)
            );
            const n2 = normalize(vNew);
            // 檢查收斂（前後方向差異很小就停止）
            if (n2.reduce((s, x, i) => s + (x - v[i]) ** 2, 0) < 1e-10) break;
            v = n2;
        }
        v = normalize(v);

        // 對應的特徵值（方差）= vᵀ · cov · v
        const Av = covDeflated.map(row => row.reduce((s, c, j) => s + c * v[j], 0));
        const lambda = v.reduce((s, x, i) => s + x * Av[i], 0);

        eigenvectors.push(v);
        eigenvalues.push(lambda);

        // Deflation：移除此特徵向量對共變異矩陣的貢獻
        covDeflated = covDeflated.map((row, i) =>
            row.map((c, j) => c - lambda * v[i] * v[j])
        );
    }

    // ③ 投影到 2D：Z = X · V
    const V = transpose(eigenvectors);  // d×k
    const coords = matMul(X, V);        // n×k

    // ④ 計算每個主成分的解釋變異量比例
    const varRatio = eigenvalues.map(ev => ev / totalVar);

    return { coords, varRatio };
}

// ===========================
// t-SNE 簡化實作
// ===========================

/**
 * 簡化版 t-SNE（教學用途）
 *
 * 完整的 t-SNE 計算成本很高，這裡使用簡化邏輯：
 * 1. 先用 PCA 降到 2D 做初始化
 * 2. 計算高維空間的高斯相似度矩陣
 * 3. 在低維空間使用 t 分布相似度
 * 4. 透過梯度下降最小化 KL 散度（200 次迭代）
 *
 * @param {number[][]} X - 標準化資料矩陣
 * @param {number} dim - 目標維度（通常為 2）
 * @returns {{ coords: number[][] }}
 */
function runTSNE(X, dim) {
    const n = X.length;
    const perplexity = Math.min(30, Math.floor(n / 3));  // 困惑度（鄰居數目的代理）
    const lr = 200;        // 學習率
    const iterations = 200;

    // ① 用 PCA 初始化 2D 座標（比隨機初始更穩定）
    let Y = runPCA(X, dim).coords.map(row => row.map(v => v * 0.01));

    // ② 計算高維空間的成對距離的高斯相似度矩陣 P
    const P = computeP(X, perplexity);

    // ③ 梯度下降迭代
    let gains = Array.from({ length: n }, () => Array(dim).fill(1));
    let iY = Array.from({ length: n }, () => Array(dim).fill(0));  // 動量

    for (let iter = 0; iter < iterations; iter++) {
        // 計算低維空間的 t 分布相似度矩陣 Q
        const { Q, num } = computeQ(Y);

        // 計算梯度
        const dY = computeGradient(Y, P, Q, num);

        // 更新帶動量的梯度下降
        const momentum = iter < 250 ? 0.5 : 0.8;
        Y = Y.map((row, i) =>
            row.map((y, d) => {
                const g = dY[i][d];
                const g_old = iY[i][d];
                // 調整 gain（自適應學習率）
                gains[i][d] = Math.max(0.01, Math.sign(g) !== Math.sign(g_old)
                    ? gains[i][d] + 0.2
                    : gains[i][d] * 0.8);
                iY[i][d] = momentum * g_old - lr * gains[i][d] * g;
                return y + iY[i][d];
            })
        );

        // 每 50 次迭代做中心化（防止漂移）
        if (iter % 50 === 0) {
            const means = Array(dim).fill(0);
            Y.forEach(row => row.forEach((v, d) => (means[d] += v)));
            means.forEach((_, d) => (means[d] /= n));
            Y = Y.map(row => row.map((v, d) => v - means[d]));
        }
    }

    return { coords: Y };
}

/** 計算高維空間的高斯相似度矩陣 P */
function computeP(X, perplexity) {
    const n = X.length;
    const logPerp = Math.log(perplexity);
    const P = Array.from({ length: n }, () => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
        // 對每個點，找到使困惑度接近目標的 sigma（二分搜尋）
        let betaMin = -Infinity, betaMax = Infinity, beta = 1.0;
        for (let trial = 0; trial < 50; trial++) {
            let sumP = 0;
            for (let j = 0; j < n; j++) {
                if (i !== j) {
                    const d2 = X[i].reduce((s, v, k) => s + (v - X[j][k]) ** 2, 0);
                    P[i][j] = Math.exp(-d2 * beta);
                    sumP += P[i][j];
                }
            }
            if (sumP === 0) sumP = 1e-10;

            // 計算實際困惑度（Shannon 熵）
            let H = 0;
            for (let j = 0; j < n; j++) {
                P[i][j] /= sumP;
                if (P[i][j] > 1e-10) H -= P[i][j] * Math.log(P[i][j]);
            }

            // 二分搜尋調整 beta
            const Hdiff = H - logPerp;
            if (Math.abs(Hdiff) < 1e-5) break;
            if (Hdiff > 0) { betaMin = beta; beta = betaMax === Infinity ? beta * 2 : (beta + betaMax) / 2; }
            else { betaMax = beta; beta = betaMin === -Infinity ? beta / 2 : (beta + betaMin) / 2; }
        }
    }

    // 對稱化：P̃ij = (Pij + Pji) / (2n)
    const Psym = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++)
            Psym[i][j] = Math.max((P[i][j] + P[j][i]) / (2 * n), 1e-10);

    return Psym;
}

/** 計算低維空間的 t 分布相似度矩陣 Q */
function computeQ(Y) {
    const n = Y.length;
    const num = Array.from({ length: n }, () => Array(n).fill(0));
    let sumQ = 0;

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const d2 = Y[i].reduce((s, v, k) => s + (v - Y[j][k]) ** 2, 0);
            const val = 1 / (1 + d2);  // t 分布核
            num[i][j] = num[j][i] = val;
            sumQ += 2 * val;
        }
    }

    const Q = num.map(row => row.map(v => Math.max(v / sumQ, 1e-10)));
    return { Q, num };
}

/** 計算 KL 散度的梯度 */
function computeGradient(Y, P, Q, num) {
    const n = Y.length;
    const dim = Y[0].length;
    const dY = Array.from({ length: n }, () => Array(dim).fill(0));

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i === j) continue;
            const mult = 4 * (P[i][j] - Q[i][j]) * num[i][j];
            for (let d = 0; d < dim; d++) {
                dY[i][d] += mult * (Y[i][d] - Y[j][d]);
            }
        }
    }
    return dY;
}

// ===========================
// LDA 線性判別分析
// ===========================

/**
 * LDA — 找到使「類別間差異最大 / 類別內分散最小」的投影方向
 *
 * 步驟：
 * 1. 計算總體均值向量 μ
 * 2. 計算類別內散度矩陣 SW（Within-class scatter）
 * 3. 計算類別間散度矩陣 SB（Between-class scatter）
 * 4. 求解廣義特徵值問題 SB · v = λ · SW · v
 *    → 等同於求 SW⁻¹ · SB 的特徵向量
 * 5. 取前 k 個特徵向量投影（最多 C-1 個）
 *
 * @param {number[][]} X - 標準化資料矩陣
 * @param {number[]} labels - 類別標籤
 * @param {number} C - 類別數目
 * @returns {{ coords: number[][], fisherScore: number }}
 */
function runLDA(X, labels, C) {
    const n = X.length;
    const d = X[0].length;

    // 計算全體均值
    const globalMean = Array(d).fill(0);
    X.forEach(row => row.forEach((v, j) => (globalMean[j] += v / n)));

    // 計算各類別的樣本均值
    const classMeans = Array.from({ length: C }, () => Array(d).fill(0));
    const classCounts = Array(C).fill(0);
    X.forEach((row, i) => {
        const c = labels[i];
        classCounts[c]++;
        row.forEach((v, j) => (classMeans[c][j] += v));
    });
    classMeans.forEach((mean, c) => mean.forEach((_, j) => (classMeans[c][j] /= classCounts[c])));

    // ① 類別內散度矩陣 SW = Σ_c Σ_{i in c} (xi - μc)(xi - μc)ᵀ
    const SW = Array.from({ length: d }, () => Array(d).fill(0));
    X.forEach((row, i) => {
        const c = labels[i];
        const diff = row.map((v, j) => v - classMeans[c][j]);
        for (let a = 0; a < d; a++)
            for (let b = 0; b < d; b++)
                SW[a][b] += diff[a] * diff[b];
    });

    // ② 類別間散度矩陣 SB = Σ_c Nc * (μc - μ)(μc - μ)ᵀ
    const SB = Array.from({ length: d }, () => Array(d).fill(0));
    classMeans.forEach((mean, c) => {
        const diff = mean.map((v, j) => v - globalMean[j]);
        for (let a = 0; a < d; a++)
            for (let b = 0; b < d; b++)
                SB[a][b] += classCounts[c] * diff[a] * diff[b];
    });

    // ③ 正則化 SW（避免奇異矩陣）
    const reg = 1e-4;
    for (let i = 0; i < d; i++) SW[i][i] += reg;

    // ④ 計算 SW⁻¹ · SB 用冪次迭代法求最大判別方向
    // 先求 SW 的 Cholesky 分解（簡化：直接用反矩陣近似）
    const SWinvSB = approxSWinvSB(SW, SB);

    // 求前兩個特徵向量（最多 C-1 個）
    const k = Math.min(2, C - 1);
    const vecs = [];
    let mat = SWinvSB.map(row => [...row]);

    for (let pc = 0; pc < k; pc++) {
        let v = Array(d).fill(0).map(() => Math.random() - 0.5);
        for (let iter = 0; iter < 200; iter++) {
            const vNew = normalize(mat.map(row => row.reduce((s, c, j) => s + c * v[j], 0)));
            if (vNew.reduce((s, x, i) => s + (x - v[i]) ** 2, 0) < 1e-12) break;
            v = vNew;
        }
        v = normalize(v);
        const lambda = mat.map(row => row.reduce((s, c, j) => s + c * v[j], 0))
            .reduce((s, x, i) => s + x * v[i], 0);
        vecs.push(v);

        // Deflation
        mat = mat.map((row, i) => row.map((c, j) => c - lambda * v[i] * v[j]));
    }

    // 若只有 1 個判別方向（C=2），補充 PCA 第一主成分
    if (vecs.length < 2) {
        const pcaResult = runPCA(X, 2);
        vecs.push(pcaResult.coords[0].map(() => 0));  // 用零向量補位，取 PCA 投影
        const coords1D = X.map(row => [
            row.reduce((s, v, j) => s + v * vecs[0][j], 0),
            pcaResult.coords[X.indexOf(row)] ? pcaResult.coords[X.indexOf(row)][0] : 0
        ]);
        // 計算 Fisher 準則分數
        const fisherScore = computeFisherScore(coords1D.map(r => [r[0]]), labels, classCounts.length);
        return { coords: coords1D, fisherScore };
    }

    // ⑤ 投影到 k 維
    const coords = X.map(row => vecs.map(v => row.reduce((s, x, j) => s + x * v[j], 0)));

    // ⑥ Fisher 準則分數 = 類別間方差 / 類別內方差
    const fisherScore = computeFisherScore(coords, labels, C);

    return { coords, fisherScore };
}

/** 計算 SW⁻¹·SB（用高斯-約旦消元法近似 SW 的逆矩陣） */
function approxSWinvSB(SW, SB) {
    const d = SW.length;
    // 增廣矩陣 [SW | I]
    const aug = SW.map((row, i) => {
        const ext = Array(d).fill(0);
        ext[i] = 1;
        return [...row, ...ext];
    });

    // 高斯-約旦消元
    for (let col = 0; col < d; col++) {
        // 找主元
        let maxRow = col;
        for (let r = col + 1; r < d; r++)
            if (Math.abs(aug[r][col]) > Math.abs(aug[maxRow][col])) maxRow = r;
        [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

        const pivot = aug[col][col] || 1e-10;
        aug[col] = aug[col].map(v => v / pivot);

        for (let r = 0; r < d; r++) {
            if (r === col) continue;
            const factor = aug[r][col];
            aug[r] = aug[r].map((v, j) => v - factor * aug[col][j]);
        }
    }

    // 取逆矩陣部分
    const SWinv = aug.map(row => row.slice(d));
    return matMul(SWinv, SB);
}

/** 計算 LDA Fisher 準則分數 */
function computeFisherScore(coords, labels, C) {
    const n = coords.length;
    const k = coords[0].length;
    const classMeans = Array.from({ length: C }, () => Array(k).fill(0));
    const classCounts = Array(C).fill(0);

    coords.forEach((row, i) => {
        const c = labels[i];
        classCounts[c]++;
        row.forEach((v, j) => (classMeans[c][j] += v));
    });
    classMeans.forEach((m, c) => m.forEach((_, j) => (classMeans[c][j] /= classCounts[c] || 1)));

    const globalMean = Array(k).fill(0);
    classMeans.forEach((m, c) => m.forEach((v, j) => (globalMean[j] += v * classCounts[c] / n)));

    // 類別間方差
    let SB = 0;
    classMeans.forEach((m, c) => {
        const d2 = m.reduce((s, v, j) => s + (v - globalMean[j]) ** 2, 0);
        SB += classCounts[c] * d2;
    });

    // 類別內方差
    let SW = 0;
    coords.forEach((row, i) => {
        const c = labels[i];
        SW += row.reduce((s, v, j) => s + (v - classMeans[c][j]) ** 2, 0);
    });

    return SW > 0 ? SB / SW : 0;
}

// ===========================
// Canvas 視覺化：散點圖
// ===========================

/**
 * 將 2D 降維結果繪製成散點圖
 *
 * @param {string} canvasId - Canvas 元素的 id
 * @param {number[][]} coords - n×2 的 2D 座標
 * @param {number[]} labels - 各點的類別標籤
 * @param {string[]} classNames - 各類別的名稱
 * @param {string} accentColor - 方法主題色（用於標題）
 * @param {string} title - 圖表標題
 */
function renderScatterPlot(canvasId, coords, labels, classNames, accentColor, title) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const PAD = 32;

    ctx.clearRect(0, 0, W, H);

    // 計算資料範圍（加 5% 邊距）
    const xs = coords.map(r => r[0]), ys = coords.map(r => r[1]);
    let xMin = Math.min(...xs), xMax = Math.max(...xs);
    let yMin = Math.min(...ys), yMax = Math.max(...ys);
    const xRange = (xMax - xMin) || 1, yRange = (yMax - yMin) || 1;
    xMin -= xRange * 0.1; xMax += xRange * 0.1;
    yMin -= yRange * 0.1; yMax += yRange * 0.1;

    // 座標轉換函數：資料座標 → Canvas 像素
    const toX = v => PAD + ((v - xMin) / (xMax - xMin)) * (W - 2 * PAD);
    const toY = v => H - PAD - ((v - yMin) / (yMax - yMin)) * (H - 2 * PAD);

    // 繪製格線
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const x = PAD + i * (W - 2 * PAD) / 4;
        const y = PAD + i * (H - 2 * PAD) / 4;
        ctx.beginPath(); ctx.moveTo(x, PAD); ctx.lineTo(x, H - PAD); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    }

    // 繪製散點
    coords.forEach(([x, y], i) => {
        const px = toX(x), py = toY(y);
        const color = CLASS_COLORS[labels[i] % CLASS_COLORS.length];

        // 外發光效果
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    });

    // 繪製圖例
    const legendY = H - 14;
    const legendSpacing = (W - PAD) / classNames.length;
    classNames.forEach((name, i) => {
        const color = CLASS_COLORS[i % CLASS_COLORS.length];
        const lx = PAD + i * legendSpacing;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(lx + 6, legendY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '10px Noto Sans TC, sans-serif';
        ctx.fillText(name, lx + 14, legendY + 4);
    });
}

// ===========================
// PCA 解釋變異量長條圖
// ===========================

/**
 * 繪製 PCA 各主成分的解釋變異量長條圖（含累積折線）
 * @param {number[]} varRatios - 各主成分的解釋變異比例（前 k 個）
 */
function renderVarianceChart(varRatios) {
    const canvas = document.getElementById('varianceCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const PAD = { top: 20, right: 20, bottom: 40, left: 50 };

    ctx.clearRect(0, 0, W, H);

    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;

    // 只顯示前 2 個主成分（本教學固定降到 2D）
    const items = varRatios.slice(0, 2).map((v, i) => ({
        label: `PC${i + 1}`,
        value: Math.max(0, Math.min(1, v))
    }));

    const barW = Math.min(60, innerW / items.length * 0.5);
    const spacing = innerW / items.length;

    items.forEach((item, i) => {
        const x = PAD.left + i * spacing + spacing * 0.25;
        const barH = item.value * innerH;
        const y = PAD.top + innerH - barH;

        // 漸層長條
        const grad = ctx.createLinearGradient(x, y, x, y + barH);
        grad.addColorStop(0, '#818cf8');
        grad.addColorStop(1, '#6366f1');
        ctx.fillStyle = grad;
        ctx.shadowColor = '#818cf8';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 百分比標籤
        ctx.fillStyle = '#f1f5f9';
        ctx.font = 'bold 12px Noto Sans TC, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${(item.value * 100).toFixed(1)}%`, x + barW / 2, y - 6);

        // X 軸標籤
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px Noto Sans TC, sans-serif';
        ctx.fillText(item.label, x + barW / 2, PAD.top + innerH + 20);
    });

    // Y 軸刻度
    ctx.fillStyle = '#64748b';
    ctx.font = '10px Noto Sans TC, sans-serif';
    ctx.textAlign = 'right';
    [0, 0.25, 0.5, 0.75, 1].forEach(v => {
        const y = PAD.top + innerH * (1 - v);
        ctx.fillText(`${(v * 100).toFixed(0)}%`, PAD.left - 5, y + 4);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PAD.left, y);
        ctx.lineTo(PAD.left + innerW, y);
        ctx.stroke();
    });

    // 累積折線（前兩個主成分的累積值）
    const cumulative = varRatios.slice(0, 2).reduce((s, v, i, arr) => {
        s.push((s[i - 1] || 0) + v);
        return s;
    }, []);

    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    cumulative.forEach((v, i) => {
        const x = PAD.left + i * spacing + spacing * 0.25 + barW / 2;
        const y = PAD.top + innerH * (1 - Math.min(v, 1));
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        // 圓點標記
        ctx.fillStyle = '#f472b6';
        ctx.arc(x, y, 4, 0, Math.PI * 2);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // 目標變異量參考線（85%）
    const refY = PAD.top + innerH * (1 - 0.85);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.moveTo(PAD.left, refY);
    ctx.lineTo(PAD.left + innerW, refY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#fbbf24';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('85% 目標線', PAD.left + innerW + 3, refY + 4);

    // 更新說明文字
    const totalVar = (cumulative[cumulative.length - 1] * 100).toFixed(1);
    document.getElementById('varianceNote').textContent =
        `前 2 個主成分合計解釋了原始資料 ${totalVar}% 的方差。` +
        (parseFloat(totalVar) >= 85
            ? '✅ 已達到 85% 的建議門檻，保留 2 個主成分是合適的。'
            : '⚠️ 低於 85% 門檻，實際應用中可能需要保留更多主成分。');
}

// ===========================
// 資料產生函數
// ===========================

/** 模擬鳶尾花資料（3 類別 × 40 筆 = 120 筆，4 維特徵） */
function generateIrisData() {
    const rng = seededRandom(42);

    // 各類別的參數（均值 ± 噪音）
    const templates = [
        { means: [5.0, 3.4, 1.5, 0.3], stds: [0.35, 0.38, 0.17, 0.10] },  // 山鳶尾
        { means: [5.9, 2.8, 4.3, 1.3], stds: [0.52, 0.31, 0.47, 0.20] },  // 偽裝鳶尾
        { means: [6.6, 3.0, 5.6, 2.0], stds: [0.63, 0.32, 0.55, 0.27] }   // 維吉尼亞
    ];

    const data = [];
    templates.forEach((t, c) => {
        for (let i = 0; i < 40; i++) {
            data.push([
                ...t.means.map((m, j) => m + (rng() - 0.5) * 2 * t.stds[j]),
                c
            ]);
        }
    });
    return data;
}

/** 模擬手寫數字資料（4 類別 × 30 筆 = 120 筆，64 維） */
function generateDigitsData() {
    const rng = seededRandom(7);
    const data = [];

    // 每個數字用一個「原型向量」加上雜訊
    const prototypes = [0, 1, 2, 3].map(d => {
        const p = Array(64).fill(0);
        // 簡單規律：讓不同數字的原型在特定像素位置有高值
        for (let k = 0; k < 12; k++) {
            const idx = Math.floor(((d * 37 + k * 13) % 64));
            p[idx] = 12 + k;
        }
        return p;
    });

    prototypes.forEach((proto, c) => {
        for (let i = 0; i < 30; i++) {
            data.push([
                ...proto.map(v => Math.max(0, v + (rng() - 0.5) * 8)),
                c
            ]);
        }
    });
    return data;
}

/** 模擬學生成績資料（3 類別 × 40 筆 = 120 筆，5 維） */
function generateStudentData() {
    const rng = seededRandom(99);
    const templates = [
        { means: [90, 88, 85, 87, 89], std: 5 },  // 優秀
        { means: [72, 70, 68, 71, 69], std: 8 },  // 普通
        { means: [55, 52, 58, 50, 54], std: 10 }  // 待加強
    ];
    const data = [];
    templates.forEach((t, c) => {
        for (let i = 0; i < 40; i++) {
            data.push([
                ...t.means.map(m => Math.max(0, Math.min(100, m + (rng() - 0.5) * 2 * t.std))),
                c
            ]);
        }
    });
    return data;
}

/**
 * 簡單的種子亂數產生器（線性同餘法）
 * 確保每次結果相同，方便學生重現
 * @param {number} seed
 */
function seededRandom(seed) {
    let s = seed;
    return function () {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        return (s >>> 0) / 4294967296;
    };
}
