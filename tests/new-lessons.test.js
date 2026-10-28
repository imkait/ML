const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'lesson-assets', 'lessons.js'), 'utf8');
const initialValues = {
    DataSplit: {train:60,validation:20},
    Backprop: {x:1,w:.8,target:1,rate:.2},
    Attention: {sentence:'cat',focus:'0'},
    RandomForest: {trees:5,noise:8,pointX:64,pointY:42},
    Imbalance: {prevalence:20,threshold:50},
    Fairness: {groupB:30,shift:-15,fairThreshold:50},
    NextToken: {temperature:1}
};

function runLesson(name) {
    const nodes = new Map();
    const canvasContext = new Proxy({}, {get: () => () => {}});
    function node(id) {
        if (!nodes.has(id)) nodes.set(id, {
            value: initialValues[name][id] ?? '', innerHTML: '', textContent: '',
            style: {}, max: 100, handlers: {},
            addEventListener(event, handler) { this.handlers[event] = handler; },
            getContext() { return canvasContext; },
            getBoundingClientRect() { return {left:0,top:0,width:330,height:250}; }
        });
        return nodes.get(id);
    }
    const document = {
        body: {dataset:{lesson:name}}, getElementById: node,
        querySelectorAll(selector) {
            assert.equal(selector, '[data-choice]');
            return [...node('stage').innerHTML.matchAll(/data-choice="(\d+)"/g)].map(match => ({
                dataset: {choice:match[1]}, addEventListener() {}
            }));
        }
    };
    const context = vm.createContext({document,Math});
    vm.runInContext(source, context);
    assert.ok(node('stage').innerHTML.length > 100, `${name} should render its stage`);
    assert.ok(node('insight').textContent.length > 0, `${name} should explain the result`);
    return {node, context, fire(id,event='click') {
        const handler=node(id).handlers[event];
        assert.ok(handler, `${name}: ${id} should handle ${event}`);
        handler({currentTarget:node(id),clientX:100,clientY:100});
    }};
}

const data=runLesson('DataSplit');
data.fire('leak');
assert.match(data.node('insight').textContent, /錯誤示範/);
data.node('train').value=70;data.fire('train','input');

const backprop=runLesson('Backprop');
const oldWeight=+backprop.node('w').value;
backprop.fire('update');
const sigmoid=1/(1+Math.exp(-.6));
const expectedWeight=oldWeight-.2*(sigmoid-1)*sigmoid*(1-sigmoid);
assert.ok(Math.abs(+backprop.node('w').value-expectedWeight)<1e-10);

const attention=runLesson('Attention');
attention.fire('mask');
assert.match(attention.node('insight').textContent, /因果遮罩已開啟/);

const forest=runLesson('RandomForest');
forest.node('trees').value=7;forest.fire('trees','input');
assert.match(forest.node('votes').innerHTML, /7/);
const simpleRows=[...Array.from({length:8},(_,i)=>({xy:[.1+i*.01,.5],label:0})),...Array.from({length:8},(_,i)=>({xy:[.8+i*.01,.5],label:1}))];
const simpleTree=forest.context.trainTree(simpleRows,2,()=>.5);
assert.equal(forest.context.predictTree(simpleTree,.15,.5),0);
assert.equal(forest.context.predictTree(simpleTree,.85,.5),1);

const imbalance=runLesson('Imbalance');
imbalance.node('prevalence').value=1;imbalance.fire('prevalence','input');
assert.match(imbalance.node('insight').textContent, /正樣本 2 筆/);
const counts=imbalance.context.confusion([{label:1,score:.8},{label:1,score:.2},{label:0,score:.7},{label:0,score:.1}],.5);
assert.deepEqual([counts.tp,counts.fn,counts.fp,counts.tn],[1,1,1,1]);
assert.equal(counts.f1,.5);

const fairness=runLesson('Fairness');
fairness.node('shift').value=-25;fairness.fire('shift','input');
assert.match(fairness.node('stage').innerHTML, /B 組漏報率/);

const next=runLesson('NextToken');
next.fire('greedy');
assert.match(next.node('stage').innerHTML, /今天天氣/);
next.fire('resetText');
assert.doesNotMatch(next.node('stage').innerHTML, /今天天氣/);

console.log('Seven new lesson smoke checks passed');
