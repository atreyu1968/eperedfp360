'use strict';
const Database=require('better-sqlite3');
function openDatabase(file){
 const db=new Database(file);
 db.pragma('journal_mode = WAL');
 db.pragma('foreign_keys = ON');
 db.exec([
  'CREATE TABLE IF NOT EXISTS settings (name TEXT PRIMARY KEY, value TEXT NOT NULL);',
  'CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT "", created_at TEXT NOT NULL);',
  'CREATE TABLE IF NOT EXISTS grants (student_id TEXT NOT NULL, resource_id TEXT NOT NULL, nonce TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(student_id,resource_id,nonce));',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_grants_nonce ON grants(nonce);',
  'CREATE TABLE IF NOT EXISTS grades (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id TEXT NOT NULL, ce TEXT NOT NULL, score REAL NOT NULL CHECK(score>=0 AND score<=10), instrument TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN (\'ordinaria\',\'recuperacion\')), validated INTEGER NOT NULL DEFAULT 0, at TEXT NOT NULL, note TEXT NOT NULL DEFAULT "");',
  'CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id,ce,id);',
  'CREATE TABLE IF NOT EXISTS recoveries (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id TEXT NOT NULL, ce TEXT NOT NULL, assigned_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT "pendiente", teacher_note TEXT NOT NULL DEFAULT "");',
  "CREATE TABLE IF NOT EXISTS submissions (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id TEXT NOT NULL, resource_id TEXT NOT NULL, ra TEXT NOT NULL, session_id TEXT NOT NULL, received_at TEXT NOT NULL, finalized_at TEXT NOT NULL, claimed_name TEXT NOT NULL DEFAULT '', claimed_student TEXT NOT NULL DEFAULT '', instrument TEXT NOT NULL, source TEXT NOT NULL, grades_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pendiente' CHECK(status IN ('pendiente','aprobada','descartada')), reviewed_at TEXT, review_note TEXT NOT NULL DEFAULT '', UNIQUE(student_id, resource_id, session_id));",
  "CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status, received_at);"

 ].join('\n'));
 const p={
  hasGrant:db.prepare('SELECT 1 FROM grants WHERE student_id=? AND resource_id=? AND expires_at>? LIMIT 1'),
  hasScopedGrant:db.prepare("SELECT 1 FROM grants WHERE student_id=? AND resource_id LIKE ? AND expires_at>? LIMIT 1"),
  addGrant:db.prepare('INSERT INTO grants(student_id,resource_id,nonce,expires_at,created_at) VALUES (?,?,?,?,?)'),
  history:db.prepare('SELECT id,ce,score,instrument,mode,validated,at,note FROM grades WHERE student_id=? ORDER BY id ASC'),
  addGrade:db.prepare('INSERT INTO grades(student_id,ce,score,instrument,mode,validated,at,note) VALUES (?,?,?,?,?,?,?,?)'),
  addRecovery:db.prepare('INSERT INTO recoveries(student_id,ce,assigned_at,status,teacher_note) VALUES (?,?,?,?,?)'),
  getSetting:db.prepare('SELECT value FROM settings WHERE name=?'),
  putSetting:db.prepare('INSERT INTO settings(name,value) VALUES (?,?) ON CONFLICT(name) DO UPDATE SET value=excluded.value'),
  listRecoveries:db.prepare('SELECT id,student_id,ce,assigned_at,status,teacher_note FROM recoveries WHERE student_id=? ORDER BY id DESC'),
  existsStudent:db.prepare('INSERT OR IGNORE INTO students(id,name,created_at) VALUES (?,?,?)'),
  existingRecovery:db.prepare("SELECT 1 FROM recoveries WHERE student_id=? AND ce=? AND status='pendiente' LIMIT 1"),
  completeRecovery:db.prepare("UPDATE recoveries SET status='superada' WHERE student_id=? AND ce=? AND status='pendiente'"),
  hasCsvImport:db.prepare('SELECT 1 FROM settings WHERE name=? LIMIT 1'),
  addSubmission:db.prepare("INSERT OR IGNORE INTO submissions(student_id,resource_id,ra,session_id,received_at,finalized_at,claimed_name,claimed_student,instrument,source,grades_json) VALUES(?,?,?,?,?,?,?,?,?,?,?)"),
  getSubmission:db.prepare("SELECT * FROM submissions WHERE id=?"),
  listSubmissions:db.prepare("SELECT id,student_id,resource_id,ra,session_id,received_at,finalized_at,claimed_name,claimed_student,instrument,source,grades_json,status,reviewed_at,review_note FROM submissions WHERE (?='todas' OR status=?) ORDER BY received_at DESC LIMIT 500"),
  studentSubmissions:db.prepare("SELECT student_id,resource_id,ra,session_id,finalized_at,claimed_name,claimed_student,instrument,source,grades_json FROM submissions WHERE student_id=? ORDER BY received_at DESC LIMIT 100"),
  setSubmissionStatus:db.prepare("UPDATE submissions SET status=?,reviewed_at=?,review_note=? WHERE id=? AND status='pendiente'")

 };
 return {
   getTeacherCredential:()=>p.getSetting.get('teacher_credential')?.value??null,
   setTeacherCredential:credential=>p.putSetting.run('teacher_credential',credential),
   ensureStudent:(id,name='')=>p.existsStudent.run(id,name,new Date().toISOString()),
   listRecoveries:id=>p.listRecoveries.all(id),
   hasPendingRecovery:(id,ce)=>!!p.existingRecovery.get(id,ce),
   completeRecovery:(id,ce)=>p.completeRecovery.run(id,ce),
   hasGrant:(studentId,resourceId)=>!!p.hasGrant.get(studentId,resourceId,Date.now()),
   hasLaunchGrant:(studentId,resourceId)=>!!p.hasGrant.get(studentId,resourceId,Date.now())||
      !!p.hasScopedGrant.get(studentId,resourceId+'@%',Date.now()),
   addGrant:(studentId,resourceId,nonce,expiresAt)=>p.addGrant.run(studentId,resourceId,nonce,expiresAt,new Date().toISOString()),
   getGrades:studentId=>p.history.all(studentId).map(x=>({...x,validated:!!x.validated})),
   // Solo uso desde proceso principal y herramientas del profesor. Nunca exponer sin autenticación.
   recordValidatedGrade:(studentId,ce,score,instrument,mode,note='')=>p.addGrade.run(studentId,ce,score,instrument,mode,1,new Date().toISOString(),note),
   assignRecovery:(studentId,ce,note='')=>p.addRecovery.run(studentId,ce,new Date().toISOString(),'pendiente',note),
   hasImportedCsv:(studentId,sha256)=>!!p.hasCsvImport.get('csv_import:'+studentId+':'+sha256),
   importValidatedCsv:(studentId,rows,instrument,sha256)=>{
    return db.transaction(()=>{
      const key='csv_import:'+studentId+':'+sha256;
      if(p.hasCsvImport.get(key))throw new Error('Este CSV ya fue importado para este alumno.');
      p.existsStudent.run(studentId,'',new Date().toISOString());
      for(const row of rows){
        p.addGrade.run(studentId,row.ce,row.score,instrument,'ordinaria',1,
          new Date().toISOString(),'CSV revisado y validado por el profesor · SHA-256 '+sha256);
      }
      p.putSetting.run(key,new Date().toISOString());
      return rows.length;
    }).immediate();
   },
   receiveSubmission:(s)=>{
     return db.transaction(()=>{
       p.existsStudent.run(s.studentId,'',new Date().toISOString());
       const result=p.addSubmission.run(s.studentId,s.resourceId,s.ra,s.sessionId,new Date().toISOString(),
         s.finalizedAt,s.claimedName,s.claimedStudent,s.instrument,s.source,JSON.stringify(s.scores));
       return {created:result.changes===1,id:result.changes===1?Number(result.lastInsertRowid):null};
     }).immediate();
   },
   listSubmissions:(status='pendiente')=>{
     return p.listSubmissions.all(status,status).map(x=>({...x,scores:JSON.parse(x.grades_json),grades_json:undefined}));
   },
   exportStudentSubmissions:id=>p.studentSubmissions.all(id).map(x=>({
     studentId:x.student_id,resourceId:x.resource_id,ra:x.ra,sessionId:x.session_id,
     finalizedAt:x.finalized_at,claimedName:x.claimed_name,claimedStudent:x.claimed_student,
     instrument:x.instrument,source:x.source,scores:JSON.parse(x.grades_json)
   })),
   reviewSubmission:(id,decision,mode,note='')=>db.transaction(()=>{
     const item=p.getSubmission.get(id);
     if(!item||item.status!=='pendiente')throw new Error('Entrega inexistente o ya revisada');
     if(!['aprobar','descartar'].includes(decision))throw new Error('Decisión inválida');
     if(decision==='aprobar'){
       if(!['ordinaria','recuperacion'].includes(mode))throw new Error('Modalidad inválida');
       const scores=JSON.parse(item.grades_json);
       for(const row of scores){
         p.addGrade.run(item.student_id,row.ce,row.score,item.instrument,mode,1,
           new Date().toISOString(),'Entregado por HTML local, validado por profesor · recepción '+id+'. '+note);
         if(mode==='recuperacion'&&row.score>=5)p.completeRecovery.run(item.student_id,row.ce);
       }
     }
     const target=decision==='aprobar'?'aprobada':'descartada';
     const updated=p.setSubmissionStatus.run(target,new Date().toISOString(),note,id);
     if(updated.changes!==1)throw new Error('No se pudo completar la revisión');
     return {id,status:target,studentId:item.student_id,ra:item.ra,count:decision==='aprobar'?JSON.parse(item.grades_json).length:0};
   }).immediate(),
   close:()=>db.close()
 };
}
module.exports={openDatabase};
