/**
 * LLM Tokenizer 分詞器互動教學 - JavaScript 邏輯
 * 實作分詞過程的視覺化與互動功能
 */

// ===========================
// 全域設定與狀態
// ===========================

// Token 顏色配置（用於視覺化顯示）
const TOKEN_COLORS = [
    '#22d3ee', '#a78bfa', '#f472b6', '#fbbf24',
    '#34d399', '#fb7185', '#60a5fa', '#c084fc',
    '#f97316', '#14b8a6', '#8b5cf6', '#ec4899'
];

// 範例文字庫
const EXAMPLES = {
    hello: 'Hello, World! This is a test.',
    chinese: '你好，世界！這是一個測試句子。',
    mixed: 'Hello 你好！AI 人工智慧 is amazing 太棒了！',
    code: 'function hello() { return "world"; }',
    emoji: '😀 Hello! 🎉 恭喜 🤖 AI 太厲害了！',
    special: 'Email: test@example.com, Price: $100.00'
};

// 模擬的 BPE 詞彙表（簡化版，用於教學演示）
const BPE_VOCAB = {
    // 常見英文 Token
    'Hello': 15496, 'hello': 31373, 'World': 10603, 'world': 14957,
    'This': 1212, 'this': 5765, 'is': 318, 'a': 64, 'the': 262,
    'test': 9288, 'function': 8818, 'return': 7955,
    // 標點符號
    ',': 11, '.': 13, '!': 0, '?': 30, ':': 25, ';': 26,
    ' ': 220, '(': 7, ')': 8, '{': 90, '}': 92, '"': 1,
    '@': 31, '$': 3, '\n': 198,
    // 中文字（每個字一個 Token）
    '你': 20046, '好': 22909, '世': 19990, '界': 30028,
    '這': 36889, '是': 26159, '一': 19968, '個': 20491,
    '測': 28204, '試': 35430, '句': 21477, '子': 23376,
    '太': 22826, '棒': 26834, '恭': 24685, '喜': 21916,
    '人': 20154, '工': 24037, '智': 26234, '慧': 24935,
    '厲': 21426, '害': 23475, '了': 20102,
    // 常見子詞
    'ing': 278, 'tion': 653, 'ed': 276, 'er': 263,
    'ly': 306, 'un': 403, 're': 260, 'pre': 1050,
    // Emoji（簡化處理）
    '😀': 99999, '🎉': 99998, '🤖': 99997
};

// 分詞模式說明
const MODE_INFO = {
    bpe: {
        description: 'BPE：使用頻率統計合併字元對',
        vocabSize: '~50,000'
    },
    char: {
        description: '字元級：每個字元為一個 Token',
        vocabSize: '~256'
    },
    word: {
        description: '詞語級：以空格和標點分割',
        vocabSize: '~100,000+'
    }
};

// 狀態管理
let state = {
    tokens: [],
    tokenIds: [],
    mode: 'bpe',
    showIds: true,
    showBytes: false,
    bpeSteps: [],
    currentStep: 0,
    isPlaying: false,
    playInterval: null
};

// ===========================
// 初始化
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    initControls();
    initAnimationControls();
});

/**
 * 初始化控制元件
 */
function initControls() {
    // 範例選擇
    const exampleSelect = document.getElementById('exampleSelect');
    exampleSelect.addEventListener('change', (e) => {
        if (e.target.value && EXAMPLES[e.target.value]) {
            document.getElementById('inputText').value = EXAMPLES[e.target.value];
        }
    });

    // 分詞模式選擇
    const modeSelect = document.getElementById('modeSelect');
    modeSelect.addEventListener('change', (e) => {
        state.mode = e.target.value;
        updateModeInfo();
        // 如果已有輸入文字，重新分詞
        const inputText = document.getElementById('inputText').value.trim();
        if (inputText) {
            tokenize();
        }
    });

    // 顯示選項
    document.getElementById('showIds').addEventListener('change', (e) => {
        state.showIds = e.target.checked;
        renderTokens();
    });

    document.getElementById('showBytes').addEventListener('change', (e) => {
        state.showBytes = e.target.checked;
        renderTokens();
    });

    // 分詞按鈕
    document.getElementById('tokenizeBtn').addEventListener('click', tokenize);

    // 清除按鈕
    document.getElementById('clearBtn').addEventListener('click', clearAll);

    // Enter 鍵觸發分詞
    document.getElementById('inputText').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            tokenize();
        }
    });
}

/**
 * 初始化動畫控制
 */
function initAnimationControls() {
    document.getElementById('prevStep').addEventListener('click', () => {
        if (state.currentStep > 0) {
            state.currentStep--;
            renderBpeStep();
        }
    });

    document.getElementById('nextStep').addEventListener('click', () => {
        if (state.currentStep < state.bpeSteps.length - 1) {
            state.currentStep++;
            renderBpeStep();
        }
    });

    document.getElementById('autoPlay').addEventListener('click', toggleAutoPlay);
}

// ===========================
// 分詞邏輯
// ===========================

/**
 * 執行分詞
 */
function tokenize() {
    const inputText = document.getElementById('inputText').value;
    
    if (!inputText.trim()) {
        alert('請輸入文字！');
        return;
    }

    // 根據模式進行分詞
    switch (state.mode) {
        case 'bpe':
            tokenizeBPE(inputText);
            break;
        case 'char':
            tokenizeChar(inputText);
            break;
        case 'word':
            tokenizeWord(inputText);
            break;
    }

    // 更新顯示
    renderTokens();
    updateStats(inputText);
    generateBpeSteps(inputText);
}

/**
 * BPE 分詞（簡化模擬版）
 * 實際的 BPE 演算法會更複雜，這裡為教學目的簡化處理
 */
function tokenizeBPE(text) {
    state.tokens = [];
    state.tokenIds = [];
    
    let i = 0;
    while (i < text.length) {
        let matched = false;
        
        // 嘗試匹配最長的已知 Token（貪婪匹配）
        for (let len = Math.min(10, text.length - i); len > 0; len--) {
            const substr = text.substring(i, i + len);
            if (BPE_VOCAB[substr] !== undefined) {
                state.tokens.push(substr);
                state.tokenIds.push(BPE_VOCAB[substr]);
                i += len;
                matched = true;
                break;
            }
        }
        
        // 如果沒有匹配，將單字元作為未知 Token
        if (!matched) {
            const char = text[i];
            state.tokens.push(char);
            // 使用字元的 Unicode 碼點作為模擬 ID
            state.tokenIds.push(char.charCodeAt(0) + 50000);
            i++;
        }
    }
}

/**
 * 字元級分詞
 */
function tokenizeChar(text) {
    state.tokens = [];
    state.tokenIds = [];
    
    for (const char of text) {
        state.tokens.push(char);
        state.tokenIds.push(char.charCodeAt(0));
    }
}

/**
 * 詞語級分詞
 */
function tokenizeWord(text) {
    state.tokens = [];
    state.tokenIds = [];
    
    // 使用正規表達式分割（保留標點符號）
    const pattern = /(\s+|[，。！？、；：""''（）\[\]{},.!?;:()\[\]{}])/;
    const parts = text.split(pattern).filter(p => p);
    
    parts.forEach((part, index) => {
        if (part.trim() || /\s/.test(part)) {
            state.tokens.push(part);
            // 簡單的雜湊函數生成 ID
            let hash = 0;
            for (const c of part) {
                hash = ((hash << 5) - hash) + c.charCodeAt(0);
                hash = hash & hash;
            }
            state.tokenIds.push(Math.abs(hash) % 100000);
        }
    });
}

// ===========================
// 視覺化渲染
// ===========================

/**
 * 渲染 Token 結果
 */
function renderTokens() {
    const display = document.getElementById('tokenDisplay');
    const idsContainer = document.getElementById('tokenIds');
    
    if (state.tokens.length === 0) {
        display.innerHTML = '<div class="placeholder-text">輸入文字後按下「開始分詞」查看結果</div>';
        idsContainer.innerHTML = '<div class="placeholder-text">分詞後將顯示對應的 Token ID</div>';
        return;
    }
    
    // 渲染 Token 視覺化
    display.innerHTML = state.tokens.map((token, i) => {
        const color = TOKEN_COLORS[i % TOKEN_COLORS.length];
        const displayText = token === ' ' ? '␣' : token === '\n' ? '↵' : escapeHtml(token);
        const byteInfo = state.showBytes ? `<div class="token-bytes">${getByteInfo(token)}</div>` : '';
        const idInfo = state.showIds ? `<div class="token-id">${state.tokenIds[i]}</div>` : '';
        
        return `
            <div class="token" style="background: ${color}20; border: 2px solid ${color}; color: ${color};"
                 title="Token: ${escapeHtml(token)}\nID: ${state.tokenIds[i]}">
                <span class="token-text">${displayText}</span>
                ${idInfo}
                ${byteInfo}
            </div>
        `;
    }).join('');
    
    // 渲染 Token ID 序列
    idsContainer.innerHTML = state.tokenIds.map((id, i) => {
        const color = TOKEN_COLORS[i % TOKEN_COLORS.length];
        return `<span class="token-id-item" style="color: ${color}; border-color: ${color}40;">${id}</span>`;
    }).join('');
}

/**
 * 更新統計資訊
 */
function updateStats(originalText) {
    const charCount = originalText.length;
    const tokenCount = state.tokens.length;
    const ratio = charCount > 0 ? (charCount / tokenCount).toFixed(2) : '-';
    
    document.getElementById('charCount').textContent = charCount;
    document.getElementById('tokenCount').textContent = tokenCount;
    document.getElementById('compressionRatio').textContent = ratio;
}

/**
 * 更新模式說明
 */
function updateModeInfo() {
    const info = MODE_INFO[state.mode];
    document.getElementById('modeDescription').textContent = info.description;
    document.getElementById('vocabSize').textContent = info.vocabSize;
}

// ===========================
// BPE 演算法步驟演示
// ===========================

/**
 * 生成 BPE 演算法步驟
 */
function generateBpeSteps(text) {
    state.bpeSteps = [];
    state.currentStep = 0;
    
    // 步驟 0：初始字元序列
    const chars = [...text];
    state.bpeSteps.push({
        title: '步驟 1：初始化',
        description: '將文字拆分成單一字元',
        tokens: chars.map(c => c === ' ' ? '␣' : c)
    });
    
    // 模擬 BPE 合併過程（簡化版）
    let currentTokens = [...chars];
    const mergeRules = [
        ['H', 'e', 'He'],
        ['He', 'l', 'Hel'],
        ['Hel', 'l', 'Hell'],
        ['Hell', 'o', 'Hello'],
        ['l', 'l', 'll'],
        ['o', 'r', 'or'],
        ['W', 'o', 'Wo'],
        ['Wo', 'r', 'Wor'],
        ['Wor', 'l', 'Worl'],
        ['Worl', 'd', 'World']
    ];
    
    // 只對英文範例顯示合併過程
    if (/[a-zA-Z]/.test(text.substring(0, 5))) {
        mergeRules.forEach((rule, idx) => {
            const [a, b, merged] = rule;
            const newTokens = [];
            let i = 0;
            let found = false;
            
            while (i < currentTokens.length) {
                if (i < currentTokens.length - 1 && 
                    currentTokens[i] === a && 
                    currentTokens[i + 1] === b && 
                    !found) {
                    newTokens.push(merged);
                    i += 2;
                    found = true;
                } else {
                    newTokens.push(currentTokens[i]);
                    i++;
                }
            }
            
            if (found) {
                currentTokens = newTokens;
                state.bpeSteps.push({
                    title: `步驟 ${state.bpeSteps.length + 1}：合併 "${a}" + "${b}"`,
                    description: `根據頻率統計，合併成 "${merged}"`,
                    tokens: currentTokens.map(c => c === ' ' ? '␣' : c),
                    mergedIndex: newTokens.indexOf(merged)
                });
            }
        });
    }
    
    // 最終結果
    state.bpeSteps.push({
        title: '最終結果',
        description: `共 ${state.tokens.length} 個 Token`,
        tokens: state.tokens.map(t => t === ' ' ? '␣' : t)
    });
    
    renderBpeStep();
    updateAnimationControls();
}

/**
 * 渲染當前 BPE 步驟
 */
function renderBpeStep() {
    const container = document.getElementById('bpeSteps');
    const step = state.bpeSteps[state.currentStep];
    
    if (!step) {
        container.innerHTML = '<div class="step-placeholder">輸入文字後，這裡將展示 BPE 演算法的逐步過程</div>';
        return;
    }
    
    const tokensHtml = step.tokens.map((token, i) => {
        const color = TOKEN_COLORS[i % TOKEN_COLORS.length];
        const isMerged = step.mergedIndex !== undefined && i === step.mergedIndex;
        const displayToken = escapeHtml(token);
        
        return `
            <div class="bpe-char ${isMerged ? 'merging' : ''}" 
                 style="background: ${color}30; border: 2px solid ${color}; color: ${color};">
                ${displayToken}
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        <div style="width: 100%; margin-bottom: 1rem;">
            <strong style="color: var(--primary-light);">${step.title}</strong>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.5rem;">${step.description}</p>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;">
            ${tokensHtml}
        </div>
    `;
    
    updateAnimationControls();
}

/**
 * 更新動畫控制按鈕狀態
 */
function updateAnimationControls() {
    const prevBtn = document.getElementById('prevStep');
    const nextBtn = document.getElementById('nextStep');
    const indicator = document.getElementById('stepIndicator');
    
    prevBtn.disabled = state.currentStep <= 0;
    nextBtn.disabled = state.currentStep >= state.bpeSteps.length - 1;
    indicator.textContent = `步驟 ${state.currentStep + 1}/${state.bpeSteps.length}`;
}

/**
 * 切換自動播放
 */
function toggleAutoPlay() {
    const btn = document.getElementById('autoPlay');
    
    if (state.isPlaying) {
        // 停止播放
        clearInterval(state.playInterval);
        state.isPlaying = false;
        btn.textContent = '▶️ 自動播放';
        btn.classList.remove('playing');
    } else {
        // 開始播放
        if (state.bpeSteps.length <= 1) return;
        
        state.isPlaying = true;
        btn.textContent = '⏹️ 停止';
        btn.classList.add('playing');
        
        // 如果已經是最後一步，從頭開始
        if (state.currentStep >= state.bpeSteps.length - 1) {
            state.currentStep = 0;
        }
        
        state.playInterval = setInterval(() => {
            if (state.currentStep < state.bpeSteps.length - 1) {
                state.currentStep++;
                renderBpeStep();
            } else {
                toggleAutoPlay(); // 播放完畢，停止
            }
        }, 1000);
    }
}

// ===========================
// 工具函數
// ===========================

/**
 * 清除所有內容
 */
function clearAll() {
    document.getElementById('inputText').value = '';
    document.getElementById('exampleSelect').value = '';
    state.tokens = [];
    state.tokenIds = [];
    state.bpeSteps = [];
    state.currentStep = 0;
    
    if (state.isPlaying) {
        toggleAutoPlay();
    }
    
    renderTokens();
    document.getElementById('charCount').textContent = '0';
    document.getElementById('tokenCount').textContent = '0';
    document.getElementById('compressionRatio').textContent = '-';
    document.getElementById('bpeSteps').innerHTML = 
        '<div class="step-placeholder">輸入文字後，這裡將展示 BPE 演算法的逐步過程</div>';
    document.getElementById('stepIndicator').textContent = '步驟 0/0';
    document.getElementById('prevStep').disabled = true;
    document.getElementById('nextStep').disabled = true;
}

/**
 * HTML 跳脫處理
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 取得位元組資訊
 */
function getByteInfo(token) {
    const bytes = new TextEncoder().encode(token);
    return `${bytes.length} bytes`;
}
