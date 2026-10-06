/* Jenius Edu teacher panel navigation — extracted from app.js. */

$("teacherLogoutBtn").onclick=async function(){await sb.auth.signOut()};
function showTeacherPage(id){document.querySelectorAll(".teacher-page").forEach(function(p){p.hidden=p.id!==id});document.querySelectorAll("#teacherMenu button").forEach(function(b){b.classList.toggle("on",b.dataset.teacherPage===id)});window.scrollTo({top:0,behavior:"smooth"})}
document.querySelectorAll("#teacherMenu button").forEach(function(b){b.onclick=function(){showTeacherPage(b.dataset.teacherPage)}});

/* Teacher schedule form handlers. */
$("scheduleForm").onsubmit=async function(e){e.preventDefault();if(!currentUser)return;var f=new FormData(e.target);var payload={teacher_id:currentUser.id,student_id:f.get("student_id"),tanggal:f.get("tanggal"),jam:f.get("jam"),mapel:f.get("mapel"),status:f.get("status")};var r=editingScheduleId?await sb.from("teacher_schedules").update(payload).eq("id",editingScheduleId).eq("teacher_id",currentUser.id):await sb.from("teacher_schedules").insert(payload);if(r.error){alert("Jadwal belum bisa disimpan. Pastikan tabel teacher_schedules sudah dibuat di Supabase.");return}editingScheduleId=null;$("scheduleSubmit").textContent="Simpan Jadwal";$("scheduleCancel").hidden=true;e.target.reset();scheduleDateToday();var q=await sb.from("teacher_schedules").select("*").order("tanggal",{ascending:true}).order("jam",{ascending:true});SCH=q.data||[];drawSchedule()}
$("scheduleCancel").onclick=function(){editingScheduleId=null;$("scheduleSubmit").textContent="Simpan Jadwal";$("scheduleCancel").hidden=true;$("scheduleForm").reset();scheduleDateToday()}
