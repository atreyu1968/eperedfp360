import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
const sourceFlag=args.find(x=>x.startsWith('--source='));
const source=sourceFlag?sourceFlag.slice('--source='.length):args[args.indexOf('--source')+1];
if(!source){console.error('Uso: npm run import:content -- --source="CARPETA_DESCOMPRIMIDA"');process.exit(2)}
if(!fs.existsSync(source)||!fs.statSync(source).isDirectory()){console.error('La carpeta de origen no existe: '+source);process.exit(2)}
const manifest=JSON.parse(fs.readFileSync(path.join(root,'curriculum/manifest.json'),'utf8'));
const candidates=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(entry.isFile()&&entry.name.toLowerCase().endsWith('.html'))candidates.push(p)}}
walk(path.resolve(source));
const byName=new Map();
for(const p of candidates){const n=path.basename(p);if(byName.has(n))console.warn('Nombre duplicado, se usa el primero: '+n);else byName.set(n,p)}
const refs=[];const missing=[];
for(const unit of manifest.units){
 const dir=path.join(root,'content',unit.id.toLowerCase());fs.mkdirSync(dir,{recursive:true});
 for(const asset of [unit.portfolio,...unit.exams]){
  const src=byName.get(asset.filename);
  if(!src){missing.push(asset.filename);continue}
  const out=path.join(dir,asset.filename);fs.copyFileSync(src,out);
  const sha256=crypto.createHash('sha256').update(fs.readFileSync(out)).digest('hex');
  refs.push({id:asset.id,file:unit.id.toLowerCase()+'/'+asset.filename,sha256});
 }
}
const out=path.join(root,'content/content-manifest.json');
fs.writeFileSync(out,JSON.stringify({importedAt:new Date().toISOString(),items:refs},null,2));
console.log('Importados: '+refs.length+'/20. Archivo de control: '+out);
if(missing.length){console.error('Faltan estos HTML: '+missing.join(', '));process.exit(1)}
console.log('Importación completa. NO copie los bancos de soluciones en content/.');
