/* Jenius Edu teacher panel navigation — extracted from app.js. */

$("teacherLogoutBtn").onclick=async function(){await window.sb.auth.signOut()};
function showTeacherPage(id){document.querySelectorAll(".teacher-page").forEach(function(p){p.hidden=p.id!==id});document.querySelectorAll("#teacherMenu button").forEach(function(b){b.classList.toggle("on",b.dataset.teacherPage===id)});window.scrollTo({top:0,behavior:"smooth"})}
document.querySelectorAll("#teacherMenu button").forEach(function(b){b.onclick=function(){showTeacherPage(b.dataset.teacherPage)}});

/* Teacher attendance edit/form handlers. */
function startEditAttendance(id){
  var x=ATT.find(function(q){return q.id===id});if(!x)return;
  editingAttendanceId=id;
  $("attendanceStudent").value=x.student_id||"";
  $("attendanceDate").value=x.tanggal||"";
  $("attendanceStatus").value=x.status||"Hadir";
  $("attendanceNote").value=x.catatan||"";
  $("attendanceSubmit").textContent="Simpan Perubahan";
  $("attendanceCancel").hidden=false;
  $("attendanceForm").scrollIntoView({behavior:"smooth",block:"start"});
}
function cancelEditAttendance(){
  editingAttendanceId=null;
  $("attendanceForm").reset();
  attendanceDateToday();
  $("attendanceStatus").value="Hadir";
  $("attendanceSubmit").textContent="Simpan Absensi";
  $("attendanceCancel").hidden=true;
}
$("attendanceCancel").onclick=cancelEditAttendance;
$("attendanceForm").onsubmit=async function(e){
  e.preventDefault();if(!currentUser)return;
  var f=new FormData(e.target);
  var payload={teacher_id:currentUser.id,student_id:f.get("student_id"),tanggal:f.get("tanggal"),status:f.get("status"),catatan:f.get("catatan")||""};
  var r=editingAttendanceId
    ? await window.sb.from("teacher_attendance").update(payload).eq("id",editingAttendanceId).eq("teacher_id",currentUser.id).select().single()
    : await window.sb.from("teacher_attendance").insert(payload).select().single();
  if(r.error){alert("Absensi belum bisa disimpan. Pastikan tabel teacher_attendance sudah dibuat di Supabase.");return}
  if(editingAttendanceId){var i=ATT.findIndex(function(x){return x.id===editingAttendanceId});if(i>=0)ATT[i]=r.data}
  else ATT.unshift(r.data);
  var wasEdit=!!editingAttendanceId;cancelEditAttendance();drawAttendance();
  alert(wasEdit?"Absensi berhasil diperbarui.":"Absensi berhasil disimpan.");
}

/* Teacher learning-notes edit/form handlers. */
function startEditTeacher(id){var x=TN.find(function(q){return q.id===id});if(!x)return;setTeacherFormOpen(true);editingTeacherId=id;$("teacherStudent").value=x.student_id||"";$("teacherDate").value=x.tanggal||"";$("teacherForm").materi.value=x.materi||"";$("teacherForm").metode.value=x.metode||"";$("teacherForm").catatan_kesulitan.value=x.catatan_kesulitan||"";$("teacherForm").rencana_lanjutan.value=x.rencana_lanjutan||"";$("teacherSubmit").textContent="Simpan Perubahan";$("teacherCancel").hidden=false;document.querySelectorAll("#teacherForm textarea,#teacherForm select,#teacherForm input").forEach(function(el){el.classList.add("teacher-editing")});$("teacherForm").scrollIntoView({behavior:"smooth",block:"start"})}
function cancelEditTeacher(){editingTeacherId=null;$("teacherForm").reset();teacherDateToday();$("teacherSubmit").textContent="Simpan Catatan";$("teacherCancel").hidden=true;document.querySelectorAll("#teacherForm textarea,#teacherForm select,#teacherForm input").forEach(function(el){el.classList.remove("teacher-editing")})}
$("teacherCancel").onclick=cancelEditTeacher;
$("teacherForm").onsubmit=async function(e){e.preventDefault();var o=fd(e.target);var payload={student_id:o.student_id,tanggal:o.tanggal,materi:o.materi,metode:o.metode,catatan_kesulitan:o.catatan_kesulitan||"",rencana_lanjutan:o.rencana_lanjutan||""};var r;if(editingTeacherId){r=await window.sb.from("teacher_notes").update(payload).eq("id",editingTeacherId).eq("teacher_id",currentUser.id).select().single()}else{r=await window.sb.from("teacher_notes").insert(Object.assign({teacher_id:currentUser.id},payload)).select().single()}if(r.error){alert((editingTeacherId?"Gagal memperbarui":"Gagal menyimpan")+" catatan: "+r.error.message);return}if(editingTeacherId){var i=TN.findIndex(function(x){return x.id===editingTeacherId});if(i>=0)TN[i]=r.data}else{TN.unshift(r.data)}var wasEdit=!!editingTeacherId;cancelEditTeacher();setTeacherFormOpen(false);drawTeacher();alert(wasEdit?"Catatan pembelajaran berhasil diperbarui.":"Catatan pembelajaran berhasil disimpan.")};

/* Teacher monthly-report edit/form handlers. */
function startEditReport(id){var x=RPT.find(function(q){return q.id===id});if(!x)return;editingReportId=id;$("reportStudent").value=x.student_id;$("reportMonth").value=x.bulan;$("reportAchievement").value=x.pencapaian||"";$("reportNote").value=x.catatan||"";$("reportRecommendation").value=x.rekomendasi||"";$("reportSave").textContent="Simpan Perubahan";$("reportCancel").hidden=false;refreshReportPreview();$("reportForm").scrollIntoView({behavior:"smooth",block:"start"})}
function cancelEditReport(){editingReportId=null;$("reportForm").reset();$("reportMonth").value=thisM;$("reportSave").textContent="Simpan Laporan";$("reportCancel").hidden=true;refreshReportPreview()}
$("reportCancel").onclick=cancelEditReport;
$("reportForm").onsubmit=async function(e){e.preventDefault();if(!currentUser)return;var o=fd(e.target);var payload={teacher_id:currentUser.id,student_id:o.student_id,bulan:o.bulan,pencapaian:o.pencapaian||"",catatan:o.catatan||"",rekomendasi:o.rekomendasi||""};var r=editingReportId?await window.sb.from("teacher_reports").update(payload).eq("id",editingReportId).eq("teacher_id",currentUser.id).select().single():await window.sb.from("teacher_reports").insert(payload).select().single();if(r.error){alert("Laporan belum bisa disimpan. Pastikan tabel teacher_reports sudah dibuat di Supabase.");return}if(editingReportId){var i=RPT.findIndex(function(x){return x.id===editingReportId});if(i>=0)RPT[i]=r.data}else{RPT.unshift(r.data)}var wasEdit=!!editingReportId;cancelEditReport();drawReports();alert(wasEdit?"Laporan berhasil diperbarui.":"Laporan berhasil disimpan.")}

/* Teacher data loading and core rendering. */
async function dbLoadTeacher(){
  if(!currentUser||!currentUser.id)throw new Error("Sesi akun guru belum tersedia. Silakan masuk kembali.");
  var teacherId=currentUser.id;
  var a=await window.sb.from("students").select("id,nama,jenjang,kelas").order("nama",{ascending:true});
  if(a.error)throw a.error;
  var b=await window.sb.from("teacher_notes").select("*").order("tanggal",{ascending:false}).order("created_at",{ascending:false});
  if(b.error)throw b.error;
  SCH=[];
  var at=await window.sb.from("teacher_attendance").select("*").order("tanggal",{ascending:false}).order("created_at",{ascending:false});
  if(at.error){console.warn("Absensi belum tersedia:",at.error.message);ATT=[];$("attendanceSync").textContent="Tabel absensi belum dibuat"}else{ATT=at.data||[];$("attendanceSync").textContent="Tersimpan di Supabase"}
  var rr=await window.sb.from("teacher_reports").select("*").eq("teacher_id",teacherId).order("bulan",{ascending:false}).order("created_at",{ascending:false});
  if(rr.error){console.warn("Laporan guru belum tersedia:",rr.error.message);RPT=[];$("reportSync").textContent="Tabel laporan belum dibuat"}else{RPT=rr.data||[];$("reportSync").textContent="Tersimpan di Supabase"}
  S=(a.data||[]).map(function(x){return {id:x.id,nama:x.nama,jenjang:x.jenjang,kelas:x.kelas}});
  TN=b.data||[];drawTeacher();drawReports()
}
function drawTeacher(){drawAttendance();var keep=$("teacherStudent").value;$("teacherStudent").innerHTML=S.map(function(m){return '<option value="'+m.id+'">'+esc(m.nama)+' — '+esc(m.jenjang||"")+' '+esc(m.kelas||"")+'</option>'}).join("")||'<option value="">Belum ada murid</option>';if(keep) $("teacherStudent").value=keep;$("teacherNotesBody").innerHTML=TN.map(function(x){var m=stu(x.student_id)||{};return '<tr><td>'+esc(m.nama||"(murid tidak ditemukan)")+'</td><td>'+esc(x.tanggal||"")+'</td><td>'+esc(x.materi||"")+'</td><td>'+esc(x.metode||"")+'</td><td>'+esc(x.catatan_kesulitan||"")+'</td><td>'+esc(x.rencana_lanjutan||"")+'</td><td><button class="sm" data-etn="'+x.id+'">Edit</button> <button class="sm" data-tn="'+x.id+'">Hapus</button></td></tr>'}).join("")||'<tr><td colspan="7">Belum ada catatan pembelajaran.</td></tr>';
var unique={};TN.forEach(function(x){if(x.student_id)unique[x.student_id]=true});
var currentMonth=thisM, today=todayISO;
$("gStudents").textContent=Object.keys(unique).length;
$("gMonthNotes").textContent=TN.filter(function(x){return String(x.tanggal||"").slice(0,7)===currentMonth}).length;
$("gTodayNotes").textContent=TN.filter(function(x){return x.tanggal===today}).length;
$("gTotalNotes").textContent=TN.length;
var teacherReminders=[];
$("teacherReminderCount").textContent=0;
$("teacherBellDot").hidden=true;
$("teacherReminderSummary").innerHTML='<div class="reminder-clear"><b>Semua selesai</b><small>Tidak ada reminder mengajar yang tertunda hari ini.</small></div>';
var latest=TN.slice().sort(function(a,b){return String(b.tanggal||"").localeCompare(String(a.tanggal||""))}).slice(0,5);
$("gLatestNotes").innerHTML=latest.map(function(x){var m=stu(x.student_id)||{};return '<div class="dashboard-alert"><div><b>'+esc(m.nama||"(murid tidak ditemukan)")+'</b><br><small>'+esc(x.tanggal||"")+' · '+esc(x.materi||"")+'</small></div><span style="color:var(--muted)">'+esc(x.metode||"")+'</span></div>'}).join("")||'<p style="color:var(--muted);margin:0">Belum ada catatan pembelajaran.</p>';
}
function attendanceDateToday(){$("attendanceDate").value=todayISO}
function drawAttendance(){
  var keep=$("attendanceStudent").value;
  $("attendanceStudent").innerHTML=S.map(function(m){return '<option value="'+m.id+'">'+esc(m.nama)+' — '+esc(m.jenjang||"")+' '+esc(m.kelas||"")+'</option>'}).join("")||'<option value="">Belum ada murid</option>';
  if(keep) $("attendanceStudent").value=keep;
  $("attendanceBody").innerHTML=ATT.map(function(x){
    var m=stu(x.student_id)||{};
    var cls=x.status==="Hadir"?"ok":(x.status==="Tidak Hadir"?"no":"");
    return '<tr><td>'+esc(x.tanggal||"")+'</td><td>'+esc(m.nama||"(murid tidak ditemukan)")+'</td><td class="'+cls+'">'+esc(x.status||"")+'</td><td>'+esc(x.catatan||"")+'</td><td><button class="sm" data-eatt="'+x.id+'">Edit</button> <button class="sm" data-datt="'+x.id+'">Hapus</button></td></tr>';
  }).join("")||'<tr><td colspan="5">Belum ada data absensi.</td></tr>';
}
/* Teacher attendance edit/form handlers moved to ./teacher.js */

function teacherDateToday(){$("teacherDate").value=new Date(new Date().getTime()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10)}

/* Teacher report rendering, PDF export and sharing. */
function reportMonthName(m){if(!m)return "";var p=String(m).split("-");var names=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];return names[Number(p[1])-1]+" "+p[0]}
function reportStats(studentId,month){var ar=ATT.filter(function(x){return x.student_id===studentId&&String(x.tanggal||"").slice(0,7)===month});var notes=TN.filter(function(x){return x.student_id===studentId&&String(x.tanggal||"").slice(0,7)===month});var q={Hadir:0,Izin:0,Sakit:0,"Tidak Hadir":0};ar.forEach(function(x){if(q[x.status]!==undefined)q[x.status]++});return {attendance:ar,notes:notes,counts:q,total:ar.length}}
function drawReports(){var keep=$("reportStudent").value;$("reportStudent").innerHTML=S.map(function(m){return '<option value="'+m.id+'">'+esc(m.nama)+' — '+esc(m.jenjang||"")+' '+esc(m.kelas||"")+'</option>'}).join("")||'<option value="">Belum ada murid</option>';if(keep)$("reportStudent").value=keep;if(!$("reportMonth").value)$("reportMonth").value=thisM;var rows=RPT.map(function(x){var m=stu(x.student_id)||{};var st=reportStats(x.student_id,x.bulan);var meetings=reportMeetingRows(x.student_id,x.bulan);return '<tr><td><b>'+esc(m.nama||"(murid tidak ditemukan)")+'</b><br><small>'+esc((m.jenjang||"")+" / "+(m.kelas||""))+'</small></td><td>'+esc(reportMonthName(x.bulan))+'</td><td>'+meetings.length+' pertemuan<br><b>'+st.counts.Hadir+' hadir</b> / '+st.total+' absensi</td><td>'+esc((x.pencapaian||"Belum diisi").slice(0,70))+'</td><td><button class="sm" data-ereport="'+x.id+'">📄 Lihat Laporan</button> <button class="sm" data-pdf-report="'+x.id+'">PDF</button> <button class="sm" data-share-report="'+x.id+'">WhatsApp</button> <button class="sm" data-parent-publish="'+x.id+'">Publikasikan ke Orang Tua</button> <button class="sm" data-parent-withdraw="'+x.id+'">Tarik dari Portal</button> <button class="sm" data-dreport="'+x.id+'">Hapus</button></td></tr>'}).join("")||'<tr><td colspan="5">Belum ada laporan bulanan.</td></tr>';$("teacherReportsBody").innerHTML=rows;refreshReportPreview()}
function syncReportFields(){var sid=$("reportStudent").value,month=$("reportMonth").value,saved=RPT.find(function(x){return x.student_id===sid&&x.bulan===month});$("reportAchievement").value=saved?saved.pencapaian||"":"";$("reportNote").value=saved?saved.catatan||"":"";$("reportRecommendation").value=saved?saved.rekomendasi||"":"";$("reportSave").textContent=saved?"Simpan Perubahan":"Simpan Laporan";$("reportCancel").hidden=!saved}function reportMeetingRows(studentId,month){var byDate={};ATT.filter(function(x){return x.student_id===studentId&&String(x.tanggal||"").slice(0,7)===month}).forEach(function(x){var k=String(x.tanggal||"");if(!byDate[k])byDate[k]={tanggal:k,status:"",catatanAbsensi:"",notes:[]};byDate[k].status=x.status||"";byDate[k].catatanAbsensi=x.catatan||""});TN.filter(function(x){return x.student_id===studentId&&String(x.tanggal||"").slice(0,7)===month}).forEach(function(x){var k=String(x.tanggal||"");if(!byDate[k])byDate[k]={tanggal:k,status:"",catatanAbsensi:"",notes:[]};byDate[k].notes.push(x)});return Object.keys(byDate).sort().map(function(k){var r=byDate[k],n=r.notes||[];return {tanggal:r.tanggal,status:r.status||"Belum diisi",catatanAbsensi:r.catatanAbsensi||"",materi:n.map(function(x){return x.materi||""}).filter(Boolean).join(" / "),metode:n.map(function(x){return x.metode||""}).filter(Boolean).join(" / "),kesulitan:n.map(function(x){return x.catatan_kesulitan||""}).filter(Boolean).join(" / "),lanjutan:n.map(function(x){return x.rencana_lanjutan||""}).filter(Boolean).join(" / ")}})}
function refreshReportPreview(){
  var sid=$("reportStudent").value,month=$("reportMonth").value;
  if(!sid||!month){
    $("reportPreview").innerHTML='<p class="report-muted" style="margin:0">Pilih murid dan bulan untuk melihat laporan.</p>';
    return
  }
  var m=stu(sid)||{},st=reportStats(sid,month),rows=reportMeetingRows(sid,month),saved=RPT.find(function(x){return x.student_id===sid&&x.bulan===month});
  var attendRate=st.total?Math.round(st.counts.Hadir/st.total*100):0;
  var achievement=$("reportAchievement").value.trim()||((saved&&saved.pencapaian)||"Belum diisi.");
  var note=$("reportNote").value.trim()||((saved&&saved.catatan)||"Belum ada catatan tambahan.");
  var rec=$("reportRecommendation").value.trim()||((saved&&saved.rekomendasi)||"Belum ada rekomendasi.");
  var no="JE-RPT-"+String(month).replace("-","")+"-"+String(sid).slice(0,8).toUpperCase();
  var meetingHtml=rows.map(function(x,i){
    return '<tr><td>'+esc(String(i+1))+'</td><td>'+esc(x.tanggal)+'</td><td><b>'+esc(x.status)+'</b>'+(x.catatanAbsensi?'<br><small>'+esc(x.catatanAbsensi)+'</small>':'')+'</td><td>'+esc(x.materi||"-")+'</td><td>'+esc(x.metode||"-")+'</td><td>'+esc(x.kesulitan||"-")+'</td><td>'+esc(x.lanjutan||"-")+'</td></tr>'
  }).join("")||'<tr><td colspan="7" style="text-align:center;color:var(--muted)">Belum ada data pertemuan pada bulan ini.</td></tr>';
  $("reportPreview").innerHTML=
    '<div class="report-invoice">'+
      '<div class="report-invoice-head">'+
        '<div><h1>JENIUS EDU</h1><small>Laporan Perkembangan Siswa</small></div>'+
        '<div class="report-invoice-title"><b>LAPORAN</b><br><span>'+esc(no)+'</span></div>'+
      '</div>'+
      '<div class="report-invoice-meta">'+
        '<div><small>Nama Siswa</small><br><b>'+esc(m.nama||"-")+'</b></div>'+
        '<div><small>Periode Laporan</small><br><b>'+esc(reportMonthName(month))+'</b></div>'+
        '<div><small>Jenjang / Kelas</small><br><b>'+esc((m.jenjang||"-")+" / "+(m.kelas||"-"))+'</b></div>'+
        '<div><small>Status Laporan</small><br><span class="report-invoice-status">'+(saved?"TERSIMPAN":"DRAFT")+'</span></div>'+
      '</div>'+
      '<div class="report-invoice-section"><h3>Rekap Kehadiran</h3>'+
        '<div class="report-invoice-kpis">'+
          '<div class="report-invoice-kpi"><small>Kehadiran</small><b>'+attendRate+'%</b></div>'+
          '<div class="report-invoice-kpi"><small>Pertemuan</small><b>'+rows.length+'</b></div>'+
          '<div class="report-invoice-kpi"><small>Hadir</small><b>'+st.counts.Hadir+'</b></div>'+
          '<div class="report-invoice-kpi"><small>Izin</small><b>'+st.counts.Izin+'</b></div>'+
          '<div class="report-invoice-kpi"><small>Sakit / Tidak Hadir</small><b>'+String(st.counts.Sakit+st.counts["Tidak Hadir"])+'</b></div>'+
        '</div>'+
      '</div>'+
      '<hr style="border:0;border-top:1px solid var(--line);margin:18px 0">'+
      '<div class="report-invoice-section"><h3>Detail Pertemuan · Absensi + Catatan Mengajar</h3>'+
        '<div class="tw"><table class="report-invoice-table"><thead><tr><th>No.</th><th>Tanggal</th><th>Absensi</th><th>Materi</th><th>Metode</th><th>Kesulitan</th><th>Rencana Lanjutan</th></tr></thead><tbody>'+meetingHtml+'</tbody></table></div>'+
      '</div>'+
      '<div class="report-invoice-section"><h3>Pencapaian / Perkembangan</h3><div class="report-invoice-note">'+esc(achievement)+'</div></div>'+
      '<div class="report-invoice-section"><h3>Catatan Guru</h3><div class="report-invoice-note">'+esc(note)+'</div></div>'+
      '<div class="report-invoice-section"><h3>Rekomendasi Bulan Berikutnya</h3><div class="report-invoice-note">'+esc(rec)+'</div></div>'+
      '<div style="display:flex;justify-content:space-between;gap:10px;margin-top:18px;padding-top:14px;border-top:1px solid var(--line)"><b class="report-invoice-total">Jenius Edu</b><span class="report-muted">'+esc(reportMonthName(month))+'</span></div>'+
      '<div class="report-invoice-footer">Dokumen laporan pembelajaran Jenius Edu · Data berasal dari absensi dan catatan mengajar guru.</div>'+
    '</div>';
}
function showReport(id){
  var x=RPT.find(function(q){return q.id===id});if(!x){alert("Laporan tidak ditemukan.");return}
  var m=stu(x.student_id)||{},st=reportStats(x.student_id,x.bulan),rows=reportMeetingRows(x.student_id,x.bulan);
  var rate=st.total?Math.round(st.counts.Hadir/st.total*100):0;
  var no="JE-RPT-"+String(x.bulan||"").replace("-","")+"-"+String(x.student_id||"").slice(0,8).toUpperCase();
  var meetingRows=rows.map(function(r,i){return '<tr><td>'+esc(String(i+1))+'</td><td>'+esc(r.tanggal||"-")+'</td><td><b>'+esc(r.status||"Belum diisi")+'</b>'+(r.catatanAbsensi?'<br><small>'+esc(r.catatanAbsensi)+'</small>':'')+'</td><td>'+esc(r.materi||"-")+'</td><td>'+esc(r.metode||"-")+'</td><td>'+esc(r.kesulitan||"-")+'</td><td>'+esc(r.lanjutan||"-")+'</td></tr>'}).join("")||'<tr><td colspan="7" style="text-align:center;color:var(--muted)">Belum ada detail pertemuan.</td></tr>';
  var old=$("reportModal");if(old)old.remove();
  var div=document.createElement("div");div.id="reportModal";div.className="invoice-modal";
  div.innerHTML='<div class="invoice-box" style="max-width:920px"><div class="invoice-head"><div><h1 style="margin:0">JENIUS EDU</h1><small>Laporan Perkembangan Siswa</small></div><div style="text-align:right"><b>LAPORAN</b><br><span>'+esc(no)+'</span></div></div><div class="invoice-meta"><div><small>Nama Siswa</small><br><b>'+esc(m.nama||"-")+'</b></div><div><small>Periode Laporan</small><br><b>'+esc(reportMonthName(x.bulan))+'</b></div><div><small>Jenjang / Kelas</small><br><b>'+esc((m.jenjang||"-")+" / "+(m.kelas||"-"))+'</b></div><div><small>Status</small><br><span class="invoice-paid">TERSIMPAN</span></div></div><hr style="border:0;border-top:1px solid var(--line);margin:18px 0"><h3 style="margin:0 0 10px">Rekap Kehadiran</h3><div class="report-invoice-kpis"><div class="report-invoice-kpi"><small>Kehadiran</small><b>'+rate+'%</b></div><div class="report-invoice-kpi"><small>Pertemuan</small><b>'+rows.length+'</b></div><div class="report-invoice-kpi"><small>Hadir</small><b>'+st.counts.Hadir+'</b></div><div class="report-invoice-kpi"><small>Izin</small><b>'+st.counts.Izin+'</b></div><div class="report-invoice-kpi"><small>Sakit / Tidak Hadir</small><b>'+String(st.counts.Sakit+st.counts["Tidak Hadir"])+'</b></div></div><div class="report-section-tight"><h3 style="margin:0 0 10px">Detail Pertemuan · Absensi + Catatan Mengajar</h3><div class="tw"><table class="report-invoice-table"><thead><tr><th>No.</th><th>Tanggal</th><th>Absensi</th><th>Materi</th><th>Metode</th><th>Kesulitan</th><th>Rencana Lanjutan</th></tr></thead><tbody>'+meetingRows+'</tbody></table></div></div><div class="report-section-tight"><h3 style="margin:0 0 8px">Pencapaian / Perkembangan</h3><div class="report-invoice-note">'+esc(x.pencapaian||"Belum diisi.")+'</div></div><div class="report-section-tight"><h3 style="margin:0 0 8px">Catatan Guru</h3><div class="report-invoice-note">'+esc(x.catatan||"Belum ada catatan tambahan.")+'</div></div><div class="report-section-tight"><h3 style="margin:0 0 8px">Rekomendasi Bulan Berikutnya</h3><div class="report-invoice-note">'+esc(x.rekomendasi||"Belum ada rekomendasi.")+'</div></div><p style="color:var(--muted);margin-top:18px">Laporan ini dibuat secara elektronik oleh Jenius Edu.</p><div class="invoice-actions"><button id="closeReport">Tutup</button><button id="printReport" class="pri">Cetak / Simpan PDF</button><button id="downloadReportModal">Download PDF</button><a class="btn pri" target="_blank" rel="noopener" href="'+wa(m.hp,"Halo "+(m.nama||"")+", berikut laporan perkembangan belajar dari Jenius Edu untuk periode "+reportMonthName(x.bulan)+".")+'">WhatsApp</a></div></div>';
  document.body.appendChild(div);
  $("closeReport").onclick=function(){div.remove()};$("printReport").onclick=function(){window.print()};$("downloadReportModal").onclick=function(){var f=downloadReportPdf(x.student_id,x.bulan);if(f)savePdfBlob(f)};
}
/* Teacher report edit/cancel handlers moved to ./teacher.js */
function reportData(studentId,month){var m=stu(studentId)||{},st=reportStats(studentId,month),saved=RPT.find(function(x){return x.student_id===studentId&&x.bulan===month});return {student:m,stats:st,achievement:$("reportAchievement").value.trim()||((saved&&saved.pencapaian)||"Belum diisi."),note:$("reportNote").value.trim()||((saved&&saved.catatan)||"Belum ada catatan tambahan."),recommendation:$("reportRecommendation").value.trim()||((saved&&saved.rekomendasi)||"Belum ada rekomendasi.")}}
function reportPdfFilename(studentId,month){var m=stu(studentId)||{};var safe=String(m.nama||"Siswa").replace(/[^a-zA-Z0-9_-]+/g,"_").replace(/^_+|_+$/g,"");return "Laporan_Jenius_Edu_"+safe+"_"+String(month||"").replace("-","_")+".pdf"}
function downloadReportPdf(studentId,month){
if(!studentId||!month){alert("Pilih murid dan periode bulan terlebih dahulu.");return null}
if(!window.jspdf||!window.jspdf.jsPDF){alert("Library PDF belum siap. Periksa koneksi internet lalu coba lagi.");return null}
var d=reportData(studentId,month),m=d.student,st=d.stats,rows=reportMeetingRows(studentId,month);
var doc=new window.jspdf.jsPDF({unit:"mm",format:"a4"}),L=14,R=196,W=182,TOP=15,BOT=282,y=15;
var blue=[21,67,107],light=[242,247,252],line=[211,230,247],ink=[55,70,85],muted=[71,102,130];
function header(){y=TOP;doc.setFont("helvetica","bold");doc.setFontSize(17);doc.setTextColor.apply(doc,blue);doc.text("JENIUS EDU",L,y);doc.setFontSize(11);doc.text("LAPORAN PERKEMBANGAN SISWA",R,y,{align:"right"});y+=6;doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor.apply(doc,muted);doc.text("Dokumen laporan belajar · "+reportMonthName(month),L,y);doc.text("Laporan No. JE-RPT-"+String(month).replace("-","")+"-"+String(studentId).slice(0,8).toUpperCase(),R,y,{align:"right"});y+=5;doc.setDrawColor.apply(doc,line);doc.line(L,y,R,y);y+=8}
function page(){doc.addPage();header()} function ensure(h){if(y+h>BOT)page()}
function section(t){ensure(14);doc.setFillColor.apply(doc,light);doc.roundedRect(L,y-5,W,9,2,2,"F");doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor.apply(doc,blue);doc.text(t,L+3,y+1);y+=11}
function lv(label,val,x,w){doc.setFont("helvetica","bold");doc.setFontSize(8);doc.setTextColor.apply(doc,muted);doc.text(label,x,y);doc.setFont("helvetica","normal");doc.setFontSize(9);doc.setTextColor.apply(doc,blue);doc.text(doc.splitTextToSize(String(val||"-"),w),x,y+5)}
function para(text){var ls=doc.splitTextToSize(String(text||"-"),W-6),i=0;doc.setFont("helvetica","normal");doc.setFontSize(9);doc.setTextColor.apply(doc,ink);while(i<ls.length){var n=Math.max(1,Math.floor((BOT-y-4)/4.5));if(!n){page();continue}var part=ls.slice(i,i+n);doc.text(part,L+3,y);y+=part.length*4.5+4;i+=part.length;if(i<ls.length)page()}}
function table(){
var cols=[9,21,25,37,27,31,32],heads=["No.","Tanggal","Absensi","Materi","Metode","Kesulitan","Rencana"];
function th(){ensure(10);doc.setFillColor.apply(doc,blue);doc.rect(L,y,W,8,"F");doc.setFont("helvetica","bold");doc.setFontSize(7);doc.setTextColor(255,255,255);var x=L;heads.forEach(function(h,i){doc.text(h,x+2,y+5);x+=cols[i]});y+=8}
th();rows.forEach(function(r,i){var v=[String(i+1),r.tanggal||"-",r.status+(r.catatanAbsensi?" — "+r.catatanAbsensi:""),r.materi||"-",r.metode||"-",r.kesulitan||"-",r.lanjutan||"-"],ls=v.map(function(q,j){return doc.splitTextToSize(String(q),cols[j]-4)}),mx=Math.max.apply(null,ls.map(function(a){return Math.max(1,a.length)})),rh=Math.max(8,mx*3.7+4);if(y+rh>BOT){page();th()}if(i%2===0){doc.setFillColor.apply(doc,light);doc.rect(L,y,W,rh,"F")}doc.setDrawColor.apply(doc,line);doc.rect(L,y,W,rh);var x=L;doc.setFont("helvetica","normal");doc.setFontSize(6.8);doc.setTextColor.apply(doc,ink);ls.forEach(function(a,j){doc.text(a,x+2,y+4);x+=cols[j]});y+=rh})}
header();lv("Nama Siswa",m.nama,L,55);lv("Jenjang / Kelas",(m.jenjang||"-")+" / "+(m.kelas||"-"),L+65,55);lv("Periode",reportMonthName(month),L+130,45);y+=14;
section("REKAP KEHADIRAN");var rate=st.total?Math.round(st.counts.Hadir/st.total*100):0;lv("Kehadiran",rate+"%",L,28);lv("Total Pertemuan",rows.length,L+38,30);lv("Hadir",st.counts.Hadir,L+78,25);lv("Izin",st.counts.Izin,L+108,25);lv("Sakit",st.counts.Sakit,L+138,25);lv("Tidak Hadir",st.counts["Tidak Hadir"],L+163,28);y+=14;
section("DETAIL PERTEMUAN · ABSENSI + CATATAN MENGAJAR");if(rows.length)table();else{doc.setFont("helvetica","normal");doc.setFontSize(9);doc.setTextColor.apply(doc,ink);doc.text("Belum ada data pertemuan pada bulan ini.",L+3,y);y+=8}y+=7;
section("PENCAPAIAN / PERKEMBANGAN");para(d.achievement);
section("CATATAN GURU");para(d.note);
section("REKOMENDASI BULAN BERIKUTNYA");para(d.recommendation);
ensure(12);doc.setDrawColor.apply(doc,line);doc.line(L,y,R,y);y+=5;doc.setFont("helvetica","normal");doc.setFontSize(7);doc.setTextColor(100,110,120);doc.text("Jenius Edu · Dokumen dibuat dari Panel Guru",L,y);doc.text(new Date().toLocaleDateString("id-ID"),R,y,{align:"right"});
var blob=doc.output("blob");return {blob:blob,filename:reportPdfFilename(studentId,month),text:"Halo Orang Tua "+(m.nama||"")+", berikut laporan perkembangan belajar "+(m.nama||"")+" dari Jenius Edu untuk periode "+reportMonthName(month)+". Laporan berisi rekap absensi dan detail catatan mengajar setiap pertemuan. Terima kasih."}
}
function savePdfBlob(file){var url=URL.createObjectURL(file.blob),a=document.createElement("a");a.href=url;a.download=file.filename;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},1500)}
async function shareReportWhatsApp(studentId,month){var file=downloadReportPdf(studentId,month);if(!file)return;try{if(navigator.share&&navigator.canShare){var f=new File([file.blob],file.filename,{type:"application/pdf"});if(navigator.canShare({files:[f]})){await navigator.share({files:[f],text:file.text,title:"Laporan Jenius Edu"});return}}savePdfBlob(file);var m=stu(studentId)||{};if(m.hp){window.open(wa(m.hp,file.text),"_blank","noopener")}else{window.open("https://wa.me/?text="+encodeURIComponent(file.text),"_blank","noopener")}alert("PDF sudah di-download. Di WhatsApp, silakan lampirkan file PDF tersebut jika belum ikut terbawa otomatis.")}catch(err){if(err&&err.name==="AbortError")return;savePdfBlob(file);var m=stu(studentId)||{};if(m.hp)window.open(wa(m.hp,file.text),"_blank","noopener");else window.open("https://wa.me/?text="+encodeURIComponent(file.text),"_blank","noopener")}}
$("reportStudent").onchange=function(){editingReportId=null;syncReportFields();refreshReportPreview()};$("reportMonth").onchange=function(){editingReportId=null;syncReportFields();refreshReportPreview()};$("reportAchievement").oninput=refreshReportPreview;$("reportNote").oninput=refreshReportPreview;$("reportRecommendation").oninput=refreshReportPreview;$("reportRefresh").onclick=refreshReportPreview;$("reportPdf").onclick=function(){var f=downloadReportPdf($("reportStudent").value,$("reportMonth").value);if(f)savePdfBlob(f)};$("reportShare").onclick=function(){shareReportWhatsApp($("reportStudent").value,$("reportMonth").value)};/* Teacher report form handlers moved to ./teacher.js */

/* Teacher delegated actions: attendance, notes, and reports. */
document.addEventListener("click",async function(e){
  var t=e.target,id=t.dataset;
  if(id.eatt){startEditAttendance(id.eatt);return}
  if(id.datt&&confirm("Hapus data absensi ini?")){
    var ar=await window.sb.from("teacher_attendance").delete().eq("id",id.datt).eq("teacher_id",currentUser.id);
    if(ar.error){alert("Gagal menghapus absensi: "+ar.error.message);return}
    ATT=ATT.filter(function(x){return x.id!==id.datt});if(editingAttendanceId===id.datt)cancelEditAttendance();drawAttendance();return
  }
  if(id.etn){startEditTeacher(id.etn);return}
  if(id.ereport){showReport(id.ereport);return}if(id.pdfReport){var px=RPT.find(function(x){return x.id===id.pdfReport});if(px){var pf=downloadReportPdf(px.student_id,px.bulan);if(pf)savePdfBlob(pf)}return}if(id.shareReport){var sx=RPT.find(function(x){return x.id===id.shareReport});if(sx){shareReportWhatsApp(sx.student_id,sx.bulan)}return}if(id.dreport&&confirm("Hapus laporan bulanan ini?")){var rr=await window.sb.from("teacher_reports").delete().eq("id",id.dreport).eq("teacher_id",currentUser.id);if(rr.error){alert("Gagal menghapus laporan: "+rr.error.message);return}RPT=RPT.filter(function(x){return x.id!==id.dreport});if(editingReportId===id.dreport)cancelEditReport();drawReports();return}if(id.tn&&confirm("Hapus catatan pembelajaran ini?")){var r=await window.sb.from("teacher_notes").delete().eq("id",id.tn).eq("teacher_id",currentUser.id);if(r.error){alert("Gagal menghapus catatan: "+r.error.message);return}TN=TN.filter(function(x){return x.id!==id.tn});if(editingTeacherId===id.tn)cancelEditTeacher();drawTeacher();alert("Catatan pembelajaran berhasil dihapus.")}
});

/* Teacher export. */
function exportTeacherExcel(){var notes=TN.map(function(x){var m=stu(x.student_id)||{};return {Nama_Murid:m.nama||"",Jenjang:m.jenjang||"",Kelas:m.kelas||"",Tanggal:x.tanggal||"",Materi:x.materi||"",Metode:x.metode||"",Catatan_Kesulitan:x.catatan_kesulitan||"",Rencana_Lanjutan:x.rencana_lanjutan||""}});downloadExcel("Jenius_Edu_Guru_"+todayISO+".xlsx",{"Catatan Pembelajaran":notes});}
$("exportTeacherBtn").onclick=function(){exportTeacherExcel()};

/* Stage 5 dashboard quick actions */
document.addEventListener("click",function(e){var b=e.target.closest("[data-quick-page]");if(!b)return;var id=b.getAttribute("data-quick-page"),menu=document.querySelector('#teacherMenu [data-teacher-page="'+id+'"]');if(menu)menu.click();});

$("teacherBell").onclick=function(e){e.stopPropagation();$("teacherNotificationPanel").hidden=!$("teacherNotificationPanel").hidden};document.addEventListener("click",function(e){if(!$("teacherNotificationPanel").hidden&&!$("teacherNotificationPanel").contains(e.target))$("teacherNotificationPanel").hidden=true});

/* Parent-visible fields only: internal notes remain private. */
(function(){var field=document.querySelector('#teacherForm [name="materi"]');if(!field)return;var hint=document.createElement('p');hint.id='parentMaterialHint';hint.textContent='Tanggal pertemuan dan materi yang disimpan akan tampil di Portal Orang Tua setelah fitur diaktifkan. Metode, kesulitan, dan rencana lanjutan tetap internal.';hint.style.cssText='font-size:12px;color:var(--muted);line-height:1.6;margin:8px 0';field.after(hint);field.setAttribute('aria-describedby','parentMaterialHint');})();

function setTeacherFormOpen(open){$("teacherForm").hidden=!open;$("teacherFormToggle").setAttribute("aria-expanded",String(open));$("teacherFormToggle").textContent="+ Simpan Catatan";}
$("teacherFormToggle").onclick=function(){setTeacherFormOpen($("teacherForm").hidden);};
