const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function loadScript(name) {
    const context = vm.createContext({
        document: { addEventListener() {} },
        window: { addEventListener() {} }
    });
    const source = fs.readFileSync(path.join(__dirname, '..', name, 'script.js'), 'utf8');
    vm.runInContext(source, context);
    return context;
}

const activation = loadScript('ActFun');
for (const x of [-3, -1, 0, 1, 3]) {
    const actual = vm.runInContext(`ACTIVATION_FUNCTIONS.swish.derivative(${x})`, activation);
    const h = 1e-5;
    const expected = vm.runInContext(
        `(ACTIVATION_FUNCTIONS.swish.func(${x + h}) - ACTIVATION_FUNCTIONS.swish.func(${x - h})) / ${2 * h}`,
        activation
    );
    assert.ok(Math.abs(actual - expected) < 1e-8, `Swish derivative at ${x}`);
}

const encoding = loadScript('CgEncoding');
const target = vm.runInContext(
    `targetEncode(['蘋果', '香蕉', '蘋果', '香蕉', '葡萄'], [30, 15, 40, 20, 50])`,
    encoding
);
assert.deepEqual(Array.from(target.encoded), [35, 17.5, 35, 17.5, 50]);

console.log('Teaching math checks passed');
