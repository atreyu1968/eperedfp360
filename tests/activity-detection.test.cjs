'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const preload=fs.readFileSync(path.join(__dirname,'../src/activity-preload.cjs'),'utf8');
function detect(nodes){
 const document={
  querySelector(selector){return nodes[selector]===undefined?null:{textContent:nodes[selector]}},
  addEventListener(){},documentElement:{append(){}}
 };
 const fakeElectron={ipcRenderer:{invoke:async()=>({ok:false})}};
 return new Function('require','document','setTimeout',preload+';return visibleTask();')(
  moduleName=>{if(moduleName!=='electron')throw Error(moduleName);return fakeElectron},
  document,()=>{});
}
test('RA1, RA2, RA5, RA6, RA7: identifica CE e índice',()=>{
 for(const pair of [[1,60],[2,45],[5,60],[6,60],[7,36]]){
  const n=pair[0],max=pair[1];
  const item=detect({'.numberbar .tag':'RA'+n+' · '+n+'.a · Actividades y evidencias',
   '.numberbar strong':'Actividad '+max+' / '+max});
  assert.equal(item.ce,'RA'+n+'.a');
  assert.equal(item.index,max);
 }
});
test('RA3 ampliado: identifica actividad y criterio',()=>{
 const item=detect({'.sectionhead .tag':'RA3 · CE 3.e · Bloque 5/6',
 '.panel.question .number':'Actividad 38 de 60 · EPE3-124'});
 assert.equal(item.ce,'RA3.e');
 assert.equal(item.index,38);
});
test('RA4: adapta el número global a los 56 ejercicios por CE',()=>{
 const first=detect({'.panel.question .labelcap':'Actividad 1 / 392 · CE 4.a'});
 const last=detect({'.panel.question .labelcap':'Actividad 392 / 392 · CE 4.g'});
 assert.equal(first.ce,'RA4.a');assert.equal(first.index,1);
 assert.equal(last.ce,'RA4.g');assert.equal(last.index,56);
});
test('sin pantalla de actividad el adaptador no bloquea el panel principal',()=>{
 assert.equal(detect({}),null);
});
