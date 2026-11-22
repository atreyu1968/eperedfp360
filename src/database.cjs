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
  'CREATE TABLE IF NOT EXISTS recoveries (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id TEXT NOT NULL, ce TEXT NOT NULL, assigned_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT "pendiente", teacher_note TEXT NOT NULL DEFAULT "");'
 ].join('\n'));
 const p={
  hasGrant:db.prepare('SELECT 1 FROM grants WHERE student_id=? AND resource_id=? AND expires_at>? LIMIT 1'),
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
  hasCsvImport:db.prepare('SELECT 1 FROM settings WHERE name=? LIMIT 1')
 };
 return {
   getTeacherCredential:()=>p.getSetting.get('teacher_credential')?.value??null,
   setTeacherCredential:credential=>p.putSetting.run('teacher_credential',credential),
   ensureStudent:(id,name='')=>p.existsStudent.run(id,name,new Date().toISOString()),
   listRecoveries:id=>p.listRecoveries.all(id),
   hasPendingRecovery:(id,ce)=>!!p.existingRecovery.get(id,ce),
   completeRecovery:(id,ce)=>p.completeRecovery.run(id,ce),
   hasGrant:(studentId,resourceId)=>!!p.hasGrant.get(studentId,resourceId,Date.now()),
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
   close:()=>db.close()
 };
}
module.exports={openDatabase};
