/* Jenius Edu teacher panel navigation — extracted from app.js. */

$("teacherLogoutBtn").onclick=async function(){await sb.auth.signOut()};
function showTeacherPage(id){document.querySelectorAll(".teacher-page").forEach(function(p){p.hidden=p.id!==id});document.querySelectorAll("#teacherMenu button").forEach(function(b){b.classList.toggle("on",b.dataset.teacherPage===id)});window.scrollTo({top:0,behavior:"smooth"})}
document.querySelectorAll("#teacherMenu button").forEach(function(b){b.onclick=function(){showTeacherPage(b.dataset.teacherPage)}});

/* Teacher schedule form handlers. */
$("scheduleForm").onsubmit=async function(e){e.preventDefault();if(!currentUser)return;var f=new FormData(e.target);var payload={teacher_id:currentUser.id,student_id:f.get("student_id"),tanggal:f.get("tanggal"),jam:f.get("jam"),mapel:f.get("mapel"),status:f.get("status")};var r=editingScheduleId?await sb.from("teacher_schedules").update(payload).eq("id",editingScheduleId).eq("teacher_id",currentUser.id):await sb.from("teacher_schedules").insert(payload);if(r.error){alert("Jadwal belum bisa disimpan. Pastikan tabel teacher_schedules sudah dibuat di Supabase.");return}editingScheduleId=null;$("scheduleSubmit").textContent="Simpan Jadwal";$("scheduleCancel").hidden=true;e.target.reset();scheduleDateToday();var q=await sb.from("teacher_schedules").select("*").order("tanggal",{ascending:true}).order("jam",{ascending:true});SCH=q.data||[];drawSchedule()}
$("scheduleCancel").onclick=function(){editingScheduleId=null;$("scheduleSubmit").textContent="Simpan Jadwal";$("scheduleCancel").hidden=true;$("scheduleForm").reset();scheduleDateToday()}

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
    ? await sb.from("teacher_attendance").update(payload).eq("id",editingAttendanceId).eq("teacher_id",currentUser.id).select().single()
    : await sb.from("teacher_attendance").insert(payload).select().single();
  if(r.error){alert("Absensi belum bisa disimpan. Pastikan tabel teacher_attendance sudah dibuat di Supabase.");return}
  if(editingAttendanceId){var i=ATT.findIndex(function(x){return x.id===editingAttendanceId});if(i>=0)ATT[i]=r.data}
  else ATT.unshift(r.data);
  var wasEdit=!!editingAttendanceId;cancelEditAttendance();drawAttendance();
  alert(wasEdit?"Absensi berhasil diperbarui.":"Absensi berhasil disimpan.");
}

/* Teacher learning-notes edit/form handlers. */
function startEditTeacher(id){var x=TN.find(function(q){return q.id===id});if(!x)return;editingTeacherId=id;$("teacherStudent").value=x.student_id||"";$("teacherDate").value=x.tanggal||"";$("teacherForm").materi.value=x.materi||"";$("teacherForm").metode.value=x.metode||"";$("teacherForm").catatan_kesulitan.value=x.catatan_kesulitan||"";$("teacherForm").rencana_lanjutan.value=x.rencana_lanjutan||"";$("teacherSubmit").textContent="Simpan Perubahan";$("teacherCancel").hidden=false;document.querySelectorAll("#teacherForm textarea,#teacherForm select,#teacherForm input").forEach(function(el){el.classList.add("teacher-editing")});$("teacherForm").scrollIntoView({behavior:"smooth",block:"start"})}
function cancelEditTeacher(){editingTeacherId=null;$("teacherForm").reset();teacherDateToday();$("teacherSubmit").textContent="Simpan Catatan";$("teacherCancel").hidden=true;document.querySelectorAll("#teacherForm textarea,#teacherForm select,#teacherForm input").forEach(function(el){el.classList.remove("teacher-editing")})}
$("teacherCancel").onclick=cancelEditTeacher;
$("teacherForm").onsubmit=async function(e){e.preventDefault();var o=fd(e.target);var payload={student_id:o.student_id,tanggal:o.tanggal,materi:o.materi,metode:o.metode,catatan_kesulitan:o.catatan_kesulitan||"",rencana_lanjutan:o.rencana_lanjutan||""};var r;if(editingTeacherId){r=await sb.from("teacher_notes").update(payload).eq("id",editingTeacherId).eq("teacher_id",currentUser.id).select().single()}else{r=await sb.from("teacher_notes").insert(Object.assign({teacher_id:currentUser.id},payload)).select().single()}if(r.error){alert((editingTeacherId?"Gagal memperbarui":"Gagal menyimpan")+" catatan: "+r.error.message);return}if(editingTeacherId){var i=TN.findIndex(function(x){return x.id===editingTeacherId});if(i>=0)TN[i]=r.data}else{TN.unshift(r.data)}var wasEdit=!!editingTeacherId;cancelEditTeacher();drawTeacher();alert(wasEdit?"Catatan pembelajaran berhasil diperbarui.":"Catatan pembelajaran berhasil disimpan.")};

/* Teacher monthly-report edit/form handlers. */
function startEditReport(id){var x=RPT.find(function(q){return q.id===id});if(!x)return;editingReportId=id;$("reportStudent").value=x.student_id;$("reportMonth").value=x.bulan;$("reportAchievement").value=x.pencapaian||"";$("reportNote").value=x.catatan||"";$("reportRecommendation").value=x.rekomendasi||"";$("reportSave").textContent="Simpan Perubahan";$("reportCancel").hidden=false;refreshReportPreview();$("reportForm").scrollIntoView({behavior:"smooth",block:"start"})}
function cancelEditReport(){editingReportId=null;$("reportForm").reset();$("reportMonth").value=thisM;$("reportSave").textContent="Simpan Laporan";$("reportCancel").hidden=true;refreshReportPreview()}
$("reportCancel").onclick=cancelEditReport;
$("reportForm").onsubmit=async function(e){e.preventDefault();if(!currentUser)return;var o=fd(e.target);var payload={teacher_id:currentUser.id,student_id:o.student_id,bulan:o.bulan,pencapaian:o.pencapaian||"",catatan:o.catatan||"",rekomendasi:o.rekomendasi||""};var r=editingReportId?await sb.from("teacher_reports").update(payload).eq("id",editingReportId).eq("teacher_id",currentUser.id).select().single():await sb.from("teacher_reports").insert(payload).select().single();if(r.error){alert("Laporan belum bisa disimpan. Pastikan tabel teacher_reports sudah dibuat di Supabase.");return}if(editingReportId){var i=RPT.findIndex(function(x){return x.id===editingReportId});if(i>=0)RPT[i]=r.data}else{RPT.unshift(r.data)}var wasEdit=!!editingReportId;cancelEditReport();drawReports();alert(wasEdit?"Laporan berhasil diperbarui.":"Laporan berhasil disimpan.")}
