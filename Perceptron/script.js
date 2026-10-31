(() => {
  'use strict';

  const presets = {
    and: { weights: [1, 1], bias: -1.5, hint: 'AND 的一組可行參數：w₁ = 1、w₂ = 1、b = −1.5。', target: (a, b) => a & b },
    or: { weights: [1, 1], bias: -0.5, hint: 'OR 的一組可行參數：w₁ = 1、w₂ = 1、b = −0.5。', target: (a, b) => a | b },
    xor: { weights: [0, 0], bias: 0, hint: 'XOR 沒有單一直線的完美解；試著訓練幾輪，觀察仍會有錯誤。', target: (a, b) => a ^ b }
  };
  const samples = [[0, 0], [0, 1], [1, 0], [1, 1]];
  const state = { preset: 'and', inputs: [1, 1], weights: [1, 1], bias: -1.5 };
  const $ = id => document.getElementById(id);
  const svgNS = 'http://www.w3.org/2000/svg';
  const format = n => (Object.is(n, -0) ? 0 : n).toFixed(1).replace('-', '−');
  const raw = n => (Object.is(n, -0) ? 0 : n).toFixed(1);
  const score = (a, b) => state.weights[0] * a + state.weights[1] * b + state.bias;
  const predict = (a, b) => Number(score(a, b) >= -1e-9);
  const target = (a, b) => presets[state.preset].target(a, b);
  const correctCount = () => samples.filter(([a, b]) => predict(a, b) === target(a, b)).length;
  const svg = (tag, attrs) => { const element = document.createElementNS(svgNS, tag); for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value)); return element; };

  function setInputs(a, b) { state.inputs = [a, b]; render(); }

  function renderDiagram() {
    const [a, b] = state.inputs;
    const z = score(a, b);
    const y = predict(a, b);
    $('svgX1').textContent = a;
    $('svgX2').textContent = b;
    $('svgW1').textContent = `w₁ = ${format(state.weights[0])}`;
    $('svgW2').textContent = `w₂ = ${format(state.weights[1])}`;
    $('svgBias').textContent = `偏差 b = ${format(state.bias)}`;
    $('svgZ').textContent = `z = ${format(z)}`;
    $('svgY').textContent = y;
    $('outputNode').classList.toggle('off', y === 0);
    $('term1').textContent = `${format(state.weights[0])} × ${a}`;
    $('term2').textContent = `${format(state.weights[1])} × ${b}`;
    $('biasTerm').textContent = `(${format(state.bias)})`;
    $('sumValue').textContent = format(z);
    $('decisionText').textContent = y ? '因為 z ≥ 0，所以輸出' : '因為 z < 0，所以輸出';
    $('resultBadge').textContent = y ? '1 · 啟動' : '0 · 未啟動';
    $('resultBadge').classList.toggle('off', y === 0);
    [a, b].forEach((value, i) => {
      const button = $(`input${i + 1}`);
      button.classList.toggle('on', value === 1);
      button.setAttribute('aria-pressed', String(value === 1));
      button.querySelector('strong').textContent = value;
    });
  }

  function renderSliders() {
    [['weight1', state.weights[0]], ['weight2', state.weights[1]], ['bias', state.bias]].forEach(([id, value]) => {
      $(id).value = raw(value);
      $(`${id}Value`).textContent = format(value);
    });
  }

  function renderTable() {
    const body = $('truthBody');
    body.replaceChildren();
    for (const [a, b] of samples) {
      const expected = target(a, b);
      const actual = predict(a, b);
      const row = document.createElement('tr');
      row.tabIndex = 0;
      row.setAttribute('aria-label', `輸入 ${a}、${b}，目標 ${expected}，預測 ${actual}，${expected === actual ? '正確' : '錯誤'}；按 Enter 選取`);
      row.classList.toggle('selected', state.inputs[0] === a && state.inputs[1] === b);
      [a, b, expected, actual].forEach(value => { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); });
      const result = document.createElement('td');
      result.textContent = expected === actual ? '✓ 正確' : '✕ 錯誤';
      result.className = expected === actual ? 'correct' : 'wrong';
      row.append(result);
      row.addEventListener('click', () => setInputs(a, b));
      row.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setInputs(a, b); } });
      body.append(row);
    }
    $('accuracy').textContent = `${correctCount()} / 4 正確`;
  }

  function renderPlot() {
    const region = $('plotRegion');
    const lineGroup = $('plotLine');
    const points = $('plotPoints');
    region.replaceChildren(); lineGroup.replaceChildren(); points.replaceChildren();
    const low = -0.17, high = 1.17;
    const square = [[low, low], [high, low], [high, high], [low, high]];
    const map = ([x, y]) => [45 + (x - low) / (high - low) * 275, 215 - (y - low) / (high - low) * 195];
    const value = ([x, y]) => score(x, y);
    const polygon = [];
    const intersections = [];
    for (let i = 0; i < square.length; i++) {
      const p = square[i], q = square[(i + 1) % square.length];
      const vp = value(p), vq = value(q);
      if (vp >= 0) polygon.push(p);
      if ((vp < 0 && vq > 0) || (vp > 0 && vq < 0)) {
        const t = vp / (vp - vq);
        const cross = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
        polygon.push(cross); intersections.push(cross);
      }
    }
    if (polygon.length >= 3) region.append(svg('polygon', { class: 'plot-region-one', points: polygon.map(p => map(p).join(',')).join(' ') }));
    if (intersections.length === 2) {
      const [x1, y1] = map(intersections[0]), [x2, y2] = map(intersections[1]);
      lineGroup.append(svg('line', { class: 'boundary-line', x1, y1, x2, y2 }));
    }
    for (const [a, b] of samples) {
      const [x, y] = map([a, b]);
      const dot = svg('circle', { cx: x, cy: y, r: 9, class: `plot-point ${predict(a, b) ? 'one' : 'zero'}${state.inputs[0] === a && state.inputs[1] === b ? ' selected' : ''}` });
      points.append(dot);
      const label = svg('text', { x: x + (a ? -32 : 13), y: y + (b ? -12 : 22), class: 'point-label' });
      label.textContent = `${a},${b}`;
      points.append(label);
    }
  }

  function render() { renderDiagram(); renderSliders(); renderTable(); renderPlot(); }

  function loadPreset() {
    state.preset = $('preset').value;
    const chosen = presets[state.preset];
    state.weights = [...chosen.weights];
    state.bias = chosen.bias;
    $('presetHint').textContent = chosen.hint;
    $('trainMessage').textContent = state.preset === 'xor' ? 'XOR 無法被單一感知器完全學會；試著驗證。' : '已載入範例參數。選取一列，就能進行一步訓練。';
    render();
  }

  function learn(a, b) {
    const error = target(a, b) - predict(a, b);
    state.weights[0] += 0.5 * error * a;
    state.weights[1] += 0.5 * error * b;
    state.bias += 0.5 * error;
    return error;
  }

  $('preset').addEventListener('change', loadPreset);
  $('resetBtn').addEventListener('click', loadPreset);
  [0, 1].forEach(i => $('input' + (i + 1)).addEventListener('click', () => { const next = [...state.inputs]; next[i] = 1 - next[i]; setInputs(...next); }));
  [['weight1', 0], ['weight2', 1]].forEach(([id, i]) => $(id).addEventListener('input', () => { state.weights[i] = Number($(id).value); render(); }));
  $('bias').addEventListener('input', () => { state.bias = Number($('bias').value); render(); });
  $('trainOne').addEventListener('click', () => {
    const [a, b] = state.inputs;
    const before = predict(a, b), expected = target(a, b), error = learn(a, b);
    render();
    $('trainMessage').textContent = error === 0 ? `輸入 (${a}, ${b})：預測 ${before}，與目標相同，參數不變。` : `輸入 (${a}, ${b})：預測 ${before}、目標 ${expected}，誤差 ${error > 0 ? '+1' : '−1'}；已調整權重與偏差。`;
  });
  $('trainEpoch').addEventListener('click', () => {
    const before = correctCount();
    let corrections = 0;
    samples.forEach(([a, b]) => { if (learn(a, b) !== 0) corrections++; });
    render();
    $('trainMessage').textContent = `本輪修正 ${corrections} 次；正確數 ${before}/4 → ${correctCount()}/4。${state.preset === 'xor' ? 'XOR 仍受單一直線的限制。' : ''}`;
  });
  render();
})();
