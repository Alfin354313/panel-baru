/* Jenius Edu teacher panel navigation — extracted from app.js. */

$("teacherLogoutBtn").onclick=async function(){await sb.auth.signOut()};
function showTeacherPage(id){document.querySelectorAll(".teacher-page").forEach(function(p){p.hidden=p.id!==id});document.querySelectorAll("#teacherMenu button").forEach(function(b){b.classList.toggle("on",b.dataset.teacherPage===id)});window.scrollTo({top:0,behavior:"smooth"})}
document.querySelectorAll("#teacherMenu button").forEach(function(b){b.onclick=function(){showTeacherPage(b.dataset.teacherPage)}});
