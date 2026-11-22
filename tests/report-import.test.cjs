'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {parseGradesCsv,decodeCsv}=require('../src/report-import.cjs');
test('importación CSV original RA5 con comas decimales',()=>{
 const header='CE;Peso;Correctas;Incorrectas;Blancas;Nota sobre 10';
 const rows='abcdef'.split('').map((c,i)=>'5.'+c+';15;28;12;0;'+(i===1?'3,50':'7,50')).join('\r\n');
 const result=parseGradesCsv('\uFEFF'+header+'\r\n'+rows+'\r\nTOTAL;100;;;;6,83');
 assert.equal(result.ra,'RA5');
 assert.equal(result.grades.length,6);
 assert.equal(result.grades[1].score,3.5);
 assert.equal(result.instrument,'portafolio');
});
test('importación CSV examen RA4',()=>{
 const header='sep=;\nCriterio;Área;Preguntas;Aciertos;Errores;Blancas;Puntos netos;Nota\n';
 const rows='abcdefg'.split('').map(c=>'4.'+c+';Fiscal;25;18;5;2;15,50;6,20').join('\n');
 const result=parseGradesCsv(header+rows+'\nTOTAL;;150;126;35;4;0;8');
 assert.equal(result.ra,'RA4');
 assert.equal(result.instrument,'prueba_objetiva');
 assert.equal(result.grades.length,7);
});
test('rechazar duplicados, incompletos y nota inválida',()=>{
 assert.throws(()=>parseGradesCsv('CE;Nota sobre 10\n1.a;5\n1.a;6'),/duplicado/);
 assert.throws(()=>parseGradesCsv('CE;Nota sobre 10\n1.a;5'),/Faltan/);
 assert.throws(()=>parseGradesCsv('CE;Nota sobre 10\n1.a;12'),/fuera de rango/);
});
test('respetar CSV con campos entrecomillados',()=>{
 const rows=decodeCsv('CE;Nota sobre 10;Nota\n"1.a";"5,20";"Buen trabajo; mejorar archivo"\n');
 assert.equal(rows[1][2],'Buen trabajo; mejorar archivo');
});
