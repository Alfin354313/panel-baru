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
