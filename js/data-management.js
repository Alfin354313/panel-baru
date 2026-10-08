/* Admin backup/restore. Database authorization is enforced by RPC, not by this UI. */
(function(){
 'use strict';
 var pending=null,busy=false;
 var tables=['students','teacher_profiles','payments','expenses','invoices','teacher_notes','teacher_schedules','teacher_attendance','teacher_reports','teacher_salaries','teacher_salary_items'];
 function el(id){return document.getElementById(id)}
 function status(message){el('dataStatus').textContent=message}
 function controls(){el('dataManagementPage').querySelectorAll('button,input').forEach(function(x){x.disabled=busy});el('dataRestore').disabled=busy||!pending}
 async function rpc(name,args){
  if(currentRole!=='admin'||!window.sb)throw new Error('Masuk sebagai Admin untuk mengelola data.');
  var result=await window.sb.rpc(name,args||{});
  if(result.error)throw new Error(result.error.message+' — Pastikan migrasi data_management.sql sudah diterapkan.');
  return result.data;
 }
 async function run(fn){if(busy)return;busy=true;controls();try{await fn()}catch(e){status('Gagal: '+e.message)}finally{busy=false;controls()}}
 async function checksum(value){
  var bytes=new TextEncoder().encode(JSON.stringify(value));
  var hash=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(hash)).map(function(x){return x.toString(16).padStart(2,'0')}).join('');
 }
 async function download(snapshot,prefix){
  var file={backup:snapshot,sha256:await checksum(snapshot)};
  var blob=new Blob([JSON.stringify(file,null,2)],{type:'application/json'});
  var url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=prefix+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';a.click();setTimeout(function(){URL.revokeObjectURL(url)},10000);
 }
 function validate(snapshot){
  if(!snapshot||snapshot.format!=='jenius-data-backup'||snapshot.version!==1||!snapshot.tables||typeof snapshot.tables!=='object'||Array.isArray(snapshot.tables))throw new Error('Format file tidak didukung.');
  var keys=Object.keys(snapshot.tables);if(!keys.length)throw new Error('File tidak memiliki tabel.');
  keys.forEach(function(t){
   if(tables.indexOf(t)<0||!Array.isArray(snapshot.tables[t]))throw new Error('Tabel tidak valid: '+t);
   var ids=new Set();snapshot.tables[t].forEach(function(row){
    if(!row||typeof row!=='object'||Array.isArray(row)||typeof row.id!=='string'||!row.id||ids.has(row.id))throw new Error('ID kosong/duplikat pada '+t);
    ids.add(row.id);
   });
  });
 }
 function summary(result){
  el('dataRestoreSummary').textContent=Object.keys(result.tables).map(function(t){var r=result.tables[t];return t+': '+r.new+' baru, '+r.existing+' sudah ada';}).join('\n');
 }
 async function list(){
  var items=await rpc('jenius_archive_list');
  var history=await window.sb.from('data_operation_logs').select('action,created_at,user_id').order('created_at',{ascending:false}).limit(50);
  if(history.error)throw new Error(history.error.message);
  el('dataOperationHistory').textContent=(history.data||[]).map(function(x){return new Date(x.created_at).toLocaleString('id-ID')+' · '+x.action+' · '+x.user_id}).join('\n')||'Belum ada aktivitas.';
  var box=el('dataArchives');box.replaceChildren();
  if(!items.length){box.textContent='Belum ada arsip. Isi nama dan tahun, lalu klik Simpan salinan arsip. Tombol Unduh salinan akan muncul di sini.';return}
  items.forEach(function(item){
   var row=document.createElement('div'),text=document.createElement('span'),button=document.createElement('button');
   row.className='data-archive-row';text.textContent=item.label+' · '+item.year+' · '+new Date(item.created_at).toLocaleString('id-ID');button.type='button';button.textContent='Unduh salinan';
   button.onclick=function(){run(async function(){status('Menyiapkan arsip…');await download(await rpc('jenius_archive_download',{archive_id:item.id}),'Jenius-Arsip');status('Unduhan arsip disiapkan.');})};
   row.append(text,button);box.append(row);
  });
 }
 el('dataBackup').onclick=function(){run(async function(){status('Mengambil seluruh data dari database…');var data=await rpc('jenius_backup');await download(data,'Jenius-Backup');status('Unduhan backup disiapkan. Tabel belum tersedia: '+(data.missing_tables.join(', ')||'tidak ada')+'. Simpan file di tempat aman.');})};
 el('dataFile').onchange=function(){pending=null;el('dataRestoreSummary').textContent='';controls()};
 el('dataValidate').onclick=function(){run(async function(){
  pending=null;var file=el('dataFile').files[0];if(!file)throw new Error('Pilih file backup dahulu.');if(file.size>50*1024*1024)throw new Error('File melebihi 50 MB.');
  status('Memeriksa file…');var envelope=JSON.parse(await file.text());
  if(!envelope.backup||typeof envelope.sha256!=='string'||await checksum(envelope.backup)!==envelope.sha256)throw new Error('Checksum tidak cocok atau file bukan hasil ekspor panel.');
  validate(envelope.backup);var result=await rpc('jenius_restore',{payload:envelope.backup,dry_run:true});summary(result);pending=envelope.backup;
  status('Pemeriksaan awal lulus. Relasi dan aturan database akan diperiksa saat restore. Data yang sudah ada harus identik; tidak ditimpa.');
 })};
 el('dataRestore').onclick=function(){run(async function(){
  if(!pending)throw new Error('Periksa file dahulu.');
  if(!confirm('Tambahkan data yang belum ada dari file ini? Data lama tidak ditimpa. Seluruh restore dibatalkan jika terjadi konflik. Backup kondisi saat ini akan diunduh terlebih dahulu.'))return;
  status('Membuat backup sebelum restore…');await download(await rpc('jenius_backup'),'Jenius-Sebelum-Restore');
  var result=await rpc('jenius_restore',{payload:pending,dry_run:false});summary(result);pending=null;
  status('Restore berhasil. Memuat ulang data panel…');
  try{await dbLoad();draw();status('Restore berhasil dan data panel diperbarui.')}catch(e){status('Restore berhasil, tetapi panel gagal dimuat ulang: '+e.message+'. Muat ulang halaman.');}
 })};
 el('dataArchiveCreate').onclick=function(){run(async function(){status('Membuat salinan arsip…');await rpc('jenius_archive',{label:el('dataArchiveLabel').value,period_year:Number(el('dataArchiveYear').value)});await list();status('Arsip tersimpan. Data sumber tetap tersedia di panel.');})};
 el('dataArchiveRefresh').onclick=function(){run(async function(){await list();status('Daftar arsip diperbarui.');})};
 el('dataArchiveView').onclick=function(){run(async function(){await list();document.querySelector('#dataManagementPage .data-list-head').scrollIntoView({behavior:'smooth',block:'start'});})};
 document.querySelectorAll('#app button[data-t="b"]').forEach(function(button){button.addEventListener('click',function(){run(list)})});
 el('dataArchiveYear').value=new Date().getFullYear()-1;controls();
})();
