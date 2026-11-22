'use strict';
const {contextBridge,ipcRenderer}=require('electron');
const call=(channel,payload)=>ipcRenderer.invoke(channel,payload);
const api=Object.freeze({
  catalog:()=>call('catalog'),
  launch:payload=>call('launch',payload),
  teacherStatus:()=>call('teacher:status'),
  teacherSetup:password=>call('teacher:setup',password),
  teacherLogin:password=>call('teacher:login',password),
  teacherLogout:()=>call('teacher:logout'),
  teacherSummary:studentId=>call('teacher:summary',studentId),
  teacherRecord:payload=>call('teacher:record',payload),
  teacherAssign:payload=>call('teacher:assign',payload),
  teacherIssue:payload=>call('teacher:issue',payload),
  teacherPreviewCsv:studentId=>call('teacher:previewCsv',studentId),
  teacherApproveCsv:previewId=>call('teacher:approveCsv',previewId),
  exportReceipts:id=>call('student:exportReceipts',id),
  teacherInbox:status=>call('teacher:inbox',status),
  teacherReviewReceipt:payload=>call('teacher:reviewReceipt',payload),
  teacherImportReceipts:()=>call('teacher:importReceipts')
});
contextBridge.exposeInMainWorld('epe',api);
