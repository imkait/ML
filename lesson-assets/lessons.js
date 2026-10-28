const $ = id => document.getElementById(id);
const lesson = document.body.dataset.lesson;
const percent = x => `${(x * 100).toFixed(1)}%`;
const metric = (label, value) => `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`;
const bar = (label, value, suffix = '%') => `<div class="barrow"><span>${label}</span><div class="bartrack"><div class="barfill" style="width:${Math.max(0, Math.min(100, value))}%"></div></div><em>${value.toFixed(1)}${suffix}</em></div>`;
const rng = seed => () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);

function watchRange(id, render) {
    $(id).addEventListener('input', () => {
        $(`${id}Value`).textContent = $(id).value;
        render();
    });
}

function initDataSplit() {
    const values = [12, 15, 14, 18, 17, 19, 21, 20, 24, 23, 26, 25, 28, 27, 30, 29, 31, 33, 35, 120];
    let leak = false;
    function render() {
        const trainPct = +$('train').value;
        $('validation').max = Math.min(30, 90 - trainPct);
        if (+$('validation').value > +$('validation').max) $('validation').value = $('validation').max;
        $('validationValue').textContent = $('validation').value;
        const nTrain = Math.round(values.length * trainPct / 100);
        const nVal = Math.round(values.length * +$('validation').value / 100);
        const fit = leak ? values : values.slice(0, nTrain);
        const min = Math.min(...fit), max = Math.max(...fit);
        const scaled = values.at(-1) - min;
        const testScaled = scaled / (max - min);
        $('stage').innerHTML = `<p class="note">依資料順序分割；第 20 筆的 120 是刻意加入的極端值。</p><div class="grid-cells">${values.map((v, i) => `<div class="cell ${i < nTrain ? 'train' : i < nTrain + nVal ? 'validation' : 'test'}">${v}</div>`).join('')}</div><div class="legend"><span>● <b>青綠</b> 訓練 ${nTrain} 筆</span><span>● <b>橘黃</b> 驗證 ${nVal} 筆</span><span>● <b>粉紅</b> 測試 ${values.length - nTrain - nVal} 筆</span></div><div class="results">${metric('縮放器學得最小值', min)}${metric('縮放器學得最大值', max)}${metric('120 的縮放結果', testScaled.toFixed(2))}</div><p class="formula">(120 − ${min}) ÷ (${max} − ${min}) = ${testScaled.toFixed(2)}</p>`;
        $('insight').className = `callout${leak ? ' warn' : ''}`;
        $('insight').textContent = leak ? '目前是錯誤示範：測試資料的 120 參與了縮放器的擬合。結果看似落在 0–1，卻偷看了測試集。' : '目前做法正確：只用訓練集擬合縮放器。測試值超過訓練範圍時，縮放結果可以大於 1。';
        $('leak').textContent = leak ? '切換：只用訓練集縮放' : '切換：錯誤地使用全部資料縮放';
    }
    watchRange('train', render); watchRange('validation', render);
    $('leak').addEventListener('click', () => { leak = !leak; render(); });
    render();
}

function initBackprop() {
    let last = '';
    const sigmoid = z => 1 / (1 + Math.exp(-z));
    function render() {
        const x = +$('x').value, w = +$('w').value, y = +$('target').value, b = -0.2;
        const z = w * x + b, a = sigmoid(z), loss = 0.5 * (a - y) ** 2;
        const dLda = a - y, dadz = a * (1 - a), dzdw = x, gradient = dLda * dadz * dzdw;
        $('stage').innerHTML = `<div class="steps"><div class="step"><b>① 線性組合</b><span class="formula">z = wx + b = ${z.toFixed(3)}</span></div><div class="step"><b>② 前向傳播</b><span class="formula">a = sigmoid(z) = ${a.toFixed(3)}</span></div><div class="step"><b>③ 計算損失</b><span class="formula">L = ½(a − y)² = ${loss.toFixed(4)}</span></div><div class="step"><b>④ 鏈式法則</b><span class="formula">dL/dw = ${gradient.toFixed(4)}</span></div></div><div class="results">${metric('dL/da', dLda.toFixed(3))}${metric('da/dz', dadz.toFixed(3))}${metric('dz/dw', dzdw.toFixed(3))}</div><p class="formula">dL/dw = (a − y) × a(1 − a) × x</p>`;
        $('insight').textContent = last || '按「更新一次權重」，觀察權重與損失如何變化。偏差 b 固定為 −0.2。';
    }
    for (const id of ['x','w','target','rate']) watchRange(id, render);
    $('update').addEventListener('click', () => {
        const x = +$('x').value, w = +$('w').value, y = +$('target').value, rate = +$('rate').value;
        const a = sigmoid(w * x - 0.2);
        const gradient = (a - y) * a * (1 - a) * x;
        const next = Math.max(-3, Math.min(3, w - rate * gradient));
        $('w').value = next;
        $('wValue').textContent = (+$('w').value).toFixed(2);
        last = `w：${w.toFixed(3)} → ${(+$('w').value).toFixed(3)}；學習率 × 梯度 = ${(rate * gradient).toFixed(4)}。`;
        render();
    });
    $('reset').addEventListener('click', () => { $('w').value = 0.8; $('wValue').textContent = '0.8'; last = ''; render(); });
    render();
}

function initAttention() {
    const examples = {
        cat: { words: ['小貓','追逐','紅色','球'], vectors: [[1,.1],[.8,.4],[.1,1],[.2,.9]] },
        rain: { words: ['今天','下雨','記得','帶傘'], vectors: [[.2,.8],[.1,1],[.7,.5],[.8,.6]] }
    };
    let masked = false;
    function fillFocus() {
        const {words} = examples[$('sentence').value];
        $('focus').innerHTML = words.map((word, i) => `<option value="${i}">${i + 1}. ${word}</option>`).join('');
    }
    function render() {
        const {words,vectors} = examples[$('sentence').value];
        const focus = +$('focus').value, q = vectors[focus];
        const scores = vectors.map((k, i) => masked && i > focus ? -Infinity : (q[0]*k[0]+q[1]*k[1])/Math.sqrt(2));
        const max = Math.max(...scores.filter(Number.isFinite));
        const exps = scores.map(s => Number.isFinite(s) ? Math.exp(s-max) : 0);
        const total = exps.reduce((a,b) => a+b,0);
        const weights = exps.map(v => v/total);
        const context = [0,1].map(d => weights.reduce((sum,w,i) => sum+w*vectors[i][d],0));
        $('stage').innerHTML = `<p class="note">目前 Query：「${words[focus]}」。分數 = Q · K / √2；經 softmax 後權重總和為 100%。</p><div class="bars">${words.map((word,i) => bar(`${word}${i===focus?' ←':''}`, weights[i]*100)).join('')}</div><div class="results">${metric('加權語境向量', `[${context.map(v=>v.toFixed(2)).join(', ')}]`)}${metric('可參照的 Token', exps.filter(v=>v>0).length)}</div><p class="formula">原始分數：${scores.map(s=>Number.isFinite(s)?s.toFixed(2):'遮罩').join('、')}</p>`;
        $('insight').textContent = masked ? '因果遮罩已開啟：目前位置之後的 Token 權重為 0。' : '目前未遮罩：示意中的 Token 可參照整句。實際權重由訓練後的模型參數決定。';
        $('mask').textContent = masked ? '關閉因果遮罩' : '開啟因果遮罩';
    }
    $('sentence').addEventListener('change', () => { fillFocus(); render(); });
    $('focus').addEventListener('change', render);
    $('mask').addEventListener('click', () => { masked = !masked; render(); });
    fillFocus(); render();
}

function gini(rows) {
    if (!rows.length) return 0;
    const p = rows.reduce((s,r)=>s+r.label,0)/rows.length;
    return 2*p*(1-p);
}

function trainTree(rows, depth, random, randomFeature = false) {
    const positive = rows.reduce((s,r)=>s+r.label,0);
    const label = positive >= rows.length/2 ? 1 : 0;
    if (depth === 0 || rows.length < 7 || positive === 0 || positive === rows.length) return {label};
    const features = randomFeature ? [Math.floor(random()*2)] : [0,1];
    let best = null, bestCost = gini(rows);
    for (const feature of features) {
        const sorted = [...new Set(rows.map(r=>r.xy[feature]))].sort((a,b)=>a-b);
        for (let i=1;i<sorted.length;i++) {
            const threshold = (sorted[i-1]+sorted[i])/2;
            const left = rows.filter(r=>r.xy[feature]<threshold), right = rows.filter(r=>r.xy[feature]>=threshold);
            if (left.length<3 || right.length<3) continue;
            const cost = (left.length*gini(left)+right.length*gini(right))/rows.length;
            if (cost<bestCost-1e-9) { bestCost=cost; best={feature,threshold,left,right}; }
        }
    }
    if (!best) return {label};
    return {label,feature:best.feature,threshold:best.threshold,left:trainTree(best.left,depth-1,random,randomFeature),right:trainTree(best.right,depth-1,random,randomFeature)};
}
function predictTree(tree,x,y) {
    while (tree.left) tree = [x,y][tree.feature] < tree.threshold ? tree.left : tree.right;
    return tree.label;
}
function initRandomForest() {
    let seed=23, data=[], forest=[], single=null, point=[.64,.42];
    const W=330,H=250;
    function makeData() {
        const random=rng(seed++);
        data=Array.from({length:64},()=>{
            const x=.05+.9*random(), y=.05+.9*random();
            let label=(x-.5)*(y-.5)>0?1:0;
            if(random()*100 < +$('noise').value) label=1-label;
            return {xy:[x,y],label};
        });
    }
    function train() {
        single=trainTree(data,3,rng(11));
        const random=rng(2026);
        forest=Array.from({length:+$('trees').value},()=>{
            const sample=Array.from({length:data.length},()=>data[Math.floor(random()*data.length)]);
            return trainTree(sample,4,random,true);
        });
    }
    function draw(canvas, classifier) {
        const ctx=canvas.getContext('2d');
        for(let py=0;py<H;py+=8) for(let px=0;px<W;px+=8){
            const result=classifier((px+4)/W,(py+4)/H);
            ctx.fillStyle=result?'#173c52':'#4b3049';ctx.fillRect(px,py,8,8);
        }
        data.forEach(r=>{ctx.beginPath();ctx.arc(r.xy[0]*W,r.xy[1]*H,4,0,Math.PI*2);ctx.fillStyle=r.label?'#5de0c3':'#ff8e9e';ctx.fill();ctx.strokeStyle='#0b1728';ctx.stroke();});
        ctx.beginPath();ctx.arc(point[0]*W,point[1]*H,7,0,Math.PI*2);ctx.strokeStyle='#ffc176';ctx.lineWidth=3;ctx.stroke();ctx.lineWidth=1;
    }
    function render() {
        $('stage').innerHTML='<p class="note">青綠點為類別 A，粉紅點為類別 B；黃圈是可點選的測試位置。</p><div class="steps"><div><b>單棵決策樹</b><canvas id="singleCanvas" width="330" height="250" role="img" aria-label="單棵決策樹分類邊界"></canvas></div><div><b>隨機森林</b><canvas id="forestCanvas" width="330" height="250" role="img" aria-label="隨機森林分類邊界"></canvas></div></div><div id="votes" class="results"></div>';
        const vote=forest.reduce((s,t)=>s+predictTree(t,...point),0);
        draw($('singleCanvas'),(x,y)=>predictTree(single,x,y));
        draw($('forestCanvas'),(x,y)=>forest.reduce((s,t)=>s+predictTree(t,x,y),0)>forest.length/2?1:0);
        $('votes').innerHTML=metric('單棵樹預測',predictTree(single,...point)?'A':'B')+metric('森林投 A',`${vote}/${forest.length}`)+metric('森林預測',vote>forest.length/2?'A':'B');
        $('insight').textContent='黃色圈的位置由學生選擇。每棵樹的資料抽樣與特徵選擇不同，因此投票可能與單棵樹不同。票數相同時歸為 B。';
        for(const id of ['singleCanvas','forestCanvas']) $(id).addEventListener('click',e=>{const r=e.currentTarget.getBoundingClientRect();point=[Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))];$('pointX').value=Math.round(point[0]*100);$('pointY').value=Math.round(point[1]*100);$('pointXValue').textContent=$('pointX').value;$('pointYValue').textContent=$('pointY').value;render();});
    }
    function rebuild(regenerate=false){if(regenerate)makeData();train();render();}
    watchRange('trees',()=>rebuild());watchRange('noise',()=>rebuild(true));
    for(const id of ['pointX','pointY'])watchRange(id,()=>{point=[+$('pointX').value/100,+$('pointY').value/100];render();});
    $('sample').addEventListener('click',()=>rebuild(true));
    makeData();rebuild();
}

function confusion(rows, threshold) {
    const count={tp:0,tn:0,fp:0,fn:0};
    rows.forEach(row=>{
        const predicted=row.score>=threshold;
        if(row.label) count[predicted?'tp':'fn']++;
        else count[predicted?'fp':'tn']++;
    });
    const precision=count.tp+count.fp?count.tp/(count.tp+count.fp):0;
    const recall=count.tp+count.fn?count.tp/(count.tp+count.fn):0;
    return {...count,accuracy:(count.tp+count.tn)/rows.length,precision,recall,f1:precision+recall?2*precision*recall/(precision+recall):0};
}

function initImbalance() {
    function render() {
        const nPos=Math.round(200*+$('prevalence').value/100), threshold=+$('threshold').value/100;
        const random=rng(42);
        const rows=Array.from({length:200},(_,i)=>({label:i<nPos?1:0,score:i<nPos?.32+.66*random():.04+.67*random()}));
        const c=confusion(rows,threshold);
        $('stage').innerHTML=`<div class="results">${metric('Accuracy',percent(c.accuracy))}${metric('Precision',percent(c.precision))}${metric('Recall',percent(c.recall))}${metric('F1',percent(c.f1))}</div><div class="matrix"><div><strong>${c.tp}</strong>TP：真陽性</div><div><strong>${c.fp}</strong>FP：偽陽性</div><div><strong>${c.fn}</strong>FN：偽陰性</div><div><strong>${c.tn}</strong>TN：真陰性</div></div><p class="note">以下分數分布中，青綠為正樣本，藍色為負樣本；白線為閾值。</p><canvas id="scoreChart" width="600" height="180" role="img" aria-label="正負樣本分數分布與分類閾值"></canvas>`;
        const canvas=$('scoreChart'),ctx=canvas.getContext('2d');
        ctx.fillStyle='#0d1d30';ctx.fillRect(0,0,600,180);
        const bins=20, pos=Array(bins).fill(0),neg=Array(bins).fill(0);
        rows.forEach(r=>{const bin=Math.max(0,Math.min(19,Math.floor(r.score*bins)));(r.label?pos:neg)[bin]++;});
        const max=Math.max(...pos.map((n,i)=>n+neg[i]),1);
        for(let i=0;i<bins;i++){
            const x=i*30+2,nh=neg[i]/max*140,ph=pos[i]/max*140;
            ctx.fillStyle='#81b8ff';ctx.fillRect(x,156-nh,24,nh);
            ctx.fillStyle='#5de0c3';ctx.fillRect(x,156-nh-ph,24,ph);
        }
        ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(threshold*600,8);ctx.lineTo(threshold*600,160);ctx.stroke();
        ctx.fillStyle='#b6c7d6';ctx.font='12px sans-serif';ctx.fillText('0',3,175);ctx.fillText('預測分數 → 1',510,175);
        $('insight').textContent=`正樣本 ${nPos} 筆、負樣本 ${200-nPos} 筆。若全部預測為負類，Accuracy 仍有 ${percent((200-nPos)/200)}，但 Recall 為 0%。`;
    }
    watchRange('prevalence',render);watchRange('threshold',render);render();
}

function initFairness() {
    function groupRows(count, shift, seed) {
        const random=rng(seed), positives=Math.round(count*.3);
        return Array.from({length:count},(_,i)=>({label:i<positives?1:0,score:Math.max(0,Math.min(1,(i<positives?.42+.55*random():.08+.53*random())+shift))}));
    }
    function render() {
        const nB=Math.round(200*+$('groupB').value/100),nA=200-nB;
        const shift=+$('shift').value/100,threshold=+$('fairThreshold').value/100;
        const a=groupRows(nA,0,13),b=groupRows(nB,shift,29);
        const ca=confusion(a,threshold),cb=confusion(b,threshold),all=confusion([...a,...b],threshold);
        $('stage').innerHTML=`<div class="results">${metric('整體 Accuracy',percent(all.accuracy))}${metric('A 組樣本',nA)}${metric('B 組樣本',nB)}</div><div class="steps"><div class="step"><b>A 組</b>Recall：${percent(ca.recall)}<br>漏報 FN：${ca.fn}<br>誤報 FP：${ca.fp}</div><div class="step"><b>B 組</b>Recall：${percent(cb.recall)}<br>漏報 FN：${cb.fn}<br>誤報 FP：${cb.fp}</div></div><div class="bars" style="margin-top:18px">${bar('A 組漏報率',(1-ca.recall)*100)}${bar('B 組漏報率',(1-cb.recall)*100)}${bar('整體準確率',all.accuracy*100)}</div>`;
        $('insight').textContent=`同一閾值 ${Math.round(threshold*100)}% 下，A、B 組漏報率相差 ${Math.abs(ca.recall-cb.recall)*100<.05?'不到 0.1':(Math.abs(ca.recall-cb.recall)*100).toFixed(1)} 個百分點。調整 B 組樣本比例，觀察整體 Accuracy 如何改變。`;
    }
    for(const id of ['groupB','shift','fairThreshold'])watchRange(id,render);
    render();
}

function initNextToken() {
    const vocab={
        '今天':[['天氣',2.4],['我',1.8],['學校',.9]],
        '天氣':[['很好',2.1],['下雨',1.7],['很冷',1.3]],
        '我':[['想',2.2],['要',1.7],['在',1.1]],
        '學校':[['舉辦',2],['裡',1.5],['。',.7]],
        '很好':[['。',2.3],['適合',1.8],['我們',.9]],
        '下雨':[['。',2],['記得',1.8],['所以',1.2]],
        '很冷':[['。',2],['記得',1.4],['但',.8]],
        '想':[['學習',2],['去',1.4],['。',.5]],
        '記得':[['帶傘',2.5],['保暖',1.7],['。',.6]],
        '帶傘':[['。',2.4],['出門',1.3],['吧',.8]],
        '學習':[['AI',2.2],['。',1.3],['新知識',1.1]],
        'AI':[['。',2.2],['知識',1.4],['模型',1.1]]
    };
    let tokens=['今天'];
    function options() {
        const last=tokens.at(-1);
        if(last==='。')return [];
        const candidates=vocab[last]||[['。',2],['一起',1.1],['繼續',.8]];
        const temp=+$('temperature').value;
        const exps=candidates.map(([,score])=>Math.exp(score/temp));
        const total=exps.reduce((a,b)=>a+b,0);
        return candidates.map(([word,score],i)=>({word,score,prob:exps[i]/total}));
    }
    function render() {
        const choices=options();
        $('stage').innerHTML=`<p class="note">目前生成的文字</p><h2 style="font-size:1.8rem;line-height:1.5">${tokens.join('')}</h2>${choices.length?`<p class="note">點選一個候選 Token 繼續：</p><div class="tokenchoices">${choices.map((c,i)=>`<button class="choice" data-choice="${i}" type="button">${c.word}<strong>${percent(c.prob)}</strong></button>`).join('')}</div><div class="bars" style="margin-top:20px">${choices.map(c=>bar(c.word,c.prob*100)).join('')}</div>`:'<p class="callout">句子已結束。按「重新開始」再試一次。</p>'}`;
        $('insight').textContent=`溫度 ${$('temperature').value}：候選分數先除以溫度，再用 softmax 轉成機率。每一步的候選清單是手工設定的教學資料。`;
        document.querySelectorAll('[data-choice]').forEach(button=>button.addEventListener('click',()=>choose(+button.dataset.choice)));
    }
    function choose(index){const list=options();if(list[index] && tokens.length<12){tokens.push(list[index].word);render();}}
    $('greedy').addEventListener('click',()=>{const list=options();if(list.length)choose(list.reduce((best,c,i)=>c.prob>list[best].prob?i:best,0));});
    $('sampleToken').addEventListener('click',()=>{const list=options();if(!list.length)return;let r=Math.random(),i=0;for(;i<list.length-1;i++){r-=list[i].prob;if(r<0)break;}choose(i);});
    $('resetText').addEventListener('click',()=>{tokens=['今天'];render();});
    watchRange('temperature',render);render();
}

const initializers={DataSplit:initDataSplit,Backprop:initBackprop,Attention:initAttention,RandomForest:initRandomForest,Imbalance:initImbalance,Fairness:initFairness,NextToken:initNextToken};
if(initializers[lesson])initializers[lesson]();
