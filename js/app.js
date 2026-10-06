/* Jenius Edu application logic — extracted from index.html. */

var $=function(i){return document.getElementById(i)};
var rp=function(n){return "Rp"+Number(n||0).toLocaleString("id-ID")};
var esc=function(t){var d=document.createElement("div");d.textContent=t==null?"":t;return d.innerHTML};
var now=new Date(),thisM=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0"),todayISO=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);
$("pb").value=thisM;$("fb").value=thisM;$("eb").value=thisM;$("et").value=todayISO;$("dashboardMonth").value=thisM;

var S=[],P=[],E=[],INV=[],TN=[],SCH=[],ATT=[],RPT=[],ADMIN_ATT=[],SAL=[],SALITEMS=[],TEACHERS=[];
var editingSalaryId=null;
var sb=null,currentUser=null,currentRole="",loginRole="admin",editingTeacherId=null,editingScheduleId=null,editingAttendanceId=null,editingReportId=null,lastStartedSessionId="";
var localKey="jenius_edu_data_v3";

function uid(p){return p+"_"+Date.now()+"_"+Math.random().toString(36).slice(2,8)}
function stu(id){return S.find(function(x){return x.id===id})}
function wa(hp,text){var n=String(hp||"").replace(/\D/g,"");if(n.indexOf("0")===0)n="62"+n.slice(1);return "https://wa.me/"+n+"?text="+encodeURIComponent(text)}
function invoiceNo(x){
  var inv=INV.find(function(q){return q.payment_id===x.id});
  if(inv&&inv.nomor_invoice)return inv.nomor_invoice;
  var d=(x.tglLunas||todayISO).replace(/-/g,"");
  var count=P.filter(function(q){return q.status==="Lunas"&&q.id!==x.id}).length+1;
  return "INV-JE-"+d+"-"+String(count).padStart(3,"0")
}
function setSync(t){$("syncStatus").textContent=t}

async function apiConfig(){
  var controller=new AbortController();
  var timer=setTimeout(function(){controller.abort()},10000);
  var r;
  try{
    r=await fetch("/api/config?ts="+Date.now(),{cache:"no-store",signal:controller.signal});
  }catch(err){
    if(err&&err.name==="AbortError")throw new Error("API konfigurasi Vercel tidak merespons dalam 10 detik.");
    throw new Error("Tidak dapat menghubungi API konfigurasi Vercel. Pastikan deployment dan /api/config tersedia.");
  }finally{
    clearTimeout(timer);
  }
  if(!r.ok)throw new Error("Konfigurasi Supabase belum tersedia di Vercel (HTTP "+r.status+").");
  var cfg=await r.json();
  if(!cfg.url||!cfg.key)throw new Error("NEXT_PUBLIC_SUPABASE_URL atau NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY belum tersedia di Vercel.");
  try{new URL(cfg.url)}catch(e){throw new Error("NEXT_PUBLIC_SUPABASE_URL tidak valid.");}
  return cfg
}

/* Teacher data loading and core rendering moved to ./teacher.js */


async function downloadExcel(filename,sheets){try{if(!window.XLSX){await new Promise(function(resolve,reject){var s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";s.onload=resolve;s.onerror=function(){reject(new Error("Library Excel gagal dimuat. Periksa koneksi internet."))};document.head.appendChild(s)})}var wb=XLSX.utils.book_new();Object.keys(sheets).forEach(function(name){var rows=sheets[name];var ws=XLSX.utils.json_to_sheet(rows.length?rows:[{}]);XLSX.utils.book_append_sheet(wb,ws,name.slice(0,31))});XLSX.writeFile(wb,filename)}catch(err){alert(err.message||"Gagal membuat file Excel.")}}
function exportTeacherExcel(){var notes=TN.map(function(x){var m=stu(x.student_id)||{};return {Nama_Murid:m.nama||"",Jenjang:m.jenjang||"",Kelas:m.kelas||"",Tanggal:x.tanggal||"",Materi:x.materi||"",Metode:x.metode||"",Catatan_Kesulitan:x.catatan_kesulitan||"",Rencana_Lanjutan:x.rencana_lanjutan||""}});downloadExcel("Jenius_Edu_Guru_"+todayISO+".xlsx",{"Catatan Pembelajaran":notes});}

async function migrateLocalIfEmpty(){
  var raw=localStorage.getItem(localKey);
  if(!raw||S.length||P.length||E.length)return;
  var old;try{old=JSON.parse(raw)}catch(e){return}
  if(!old||(!old.students&&!old.payments&&!old.expenses))return;
  setSync("Memindahkan data lama...");
  var idMap={};
  for(const m of (old.students||[])){
    var r=await sb.from("students").insert({nama:m.nama,jenjang:m.jenjang,kelas:m.kelas,ortu:m.ortu,hp:m.hp,biaya:Number(m.biaya||0)}).select().single();
    if(r.error)throw r.error;
    idMap[m.id]=r.data.id;
  }
  for(const x of (old.payments||[])){
    var pr=await sb.from("payments").insert({student_id:idMap[x.sid]||null,bulan:x.bulan,jumlah:Number(x.jumlah||0),metode:x.metode||"",status:x.status||"Belum",tanggal_bayar:x.tglLunas||null}).select().single();
    if(pr.error)throw pr.error;
    if(x.status==="Lunas"){
      var no=x.invoiceNo||invoiceNo({id:pr.data.id,tglLunas:x.tglLunas,bulan:x.bulan});
      var ir=await sb.from("invoices").insert({payment_id:pr.data.id,nomor_invoice:no,tanggal_invoice:x.tglLunas||todayISO,total:Number(x.jumlah||0),status:"LUNAS"});
      if(ir.error)throw ir.error;
    }
  }
  for(const x of (old.expenses||[])){
    var er=await sb.from("expenses").insert({tanggal:x.tgl,kategori:x.kat||"",keterangan:x.ket||"",jumlah:Number(x.jumlah||0)});
    if(er.error)throw er.error;
  }
  await dbLoad();
  setSync("Data lama berhasil dipindahkan");
}

document.querySelectorAll("#app .top-menu .tabs button").forEach(function(b){
  b.onclick=function(){
    document.querySelectorAll("#app .top-menu .tabs button").forEach(function(x){x.classList.toggle("on",x===b)});
    ["d","m","p","e","u","g"].forEach(function(k){
      var el=k==="d"?$("dashboard"):k==="g"?$("salaryPage"):k==="u"?$("teacherMasterPage"):$("t"+k);
      if(el)el.hidden=k!==b.dataset.t;
    });
    if(b.dataset.focus){
      setTimeout(function(){
        var target=b.dataset.t==="m"?$("fm"):b.dataset.t==="p"?$("bp"):b.dataset.t==="e"?$("be"):b.dataset.t==="u"?$("teacherMasterForm"):b.dataset.t==="g"?$("salaryForm"):null;
        if(target)target.scrollIntoView({behavior:"smooth",block:"start"});
      },50);
    }
  }
});

/* Admin dashboard/rendering/master-guru moved to ./admin.js */
/* Admin salary helpers/forms moved to ./admin.js */
/* Teacher report rendering, PDF and sharing moved to ./teacher.js */


/* Teacher notes edit/form handlers moved to ./teacher.js */

function fd(f){var o={};new FormData(f).forEach(function(v,k){o[k]=v});return o}

/* Admin student add/edit handlers moved to ./admin.js */


/* Admin payment form handler moved to ./admin.js */

/* Admin expense form handler moved to ./admin.js */

/* Teacher delegated actions moved to ./teacher.js */

/* Login UI/authentication handlers moved to ./auth.js */

$("exportAdminBtn").onclick=function(){exportAdminExcel()};
$("exportTeacherBtn").onclick=function(){exportTeacherExcel()};
$("logoutBtn").onclick=async function(){await sb.auth.signOut()};
/* Teacher schedule form handlers moved to ./teacher.js */

/* Teacher navigation/logout handlers moved to ./teacher.js */
async function startApp(session){
  if(!session||!session.user){
    currentUser=null;currentRole="";lastStartedSessionId="";
    $("app").hidden=true;$("app").style.display="none";
    $("teacherApp").hidden=true;$("teacherApp").style.display="none";
    $("loginScreen").hidden=false;$("loginScreen").style.display="flex";$("loginScreen").setAttribute("aria-hidden","false");
    document.body.classList.remove("logged-in");
    setSync("Silakan masuk");
    return
  }
  lastStartedSessionId=session.user.id;
  currentUser=session.user;
  currentRole=normalizeRole(currentUser.app_metadata&&currentUser.app_metadata.role);
  if(currentRole!=="admin"&&currentRole!=="guru"){
    $("loginScreen").style.display="flex";$("loginScreen").hidden=false;$("loginScreen").setAttribute("aria-hidden","false");$("app").style.display="none";$("teacherApp").style.display="none";
    throw new Error("Role akun tidak terbaca sebagai admin/guru. Role: "+(currentRole||"KOSONG"))
  }
  $("loginScreen").style.display="none";$("loginScreen").hidden=true;$("loginScreen").setAttribute("aria-hidden","true");
  /* Pastikan atribut hidden lama tidak membuat panel tetap putih/kosong setelah login ulang. */
  $("app").hidden=false;
  $("teacherApp").hidden=false;
  if(currentRole==="guru"){
    $("app").hidden=true;
    $("app").style.display="none";
    $("teacherApp").hidden=false;
    $("teacherApp").style.display="block";
    $("teacherSync").textContent="Memuat...";
    try{await dbLoadTeacher();teacherDateToday();attendanceDateToday();scheduleDateToday();$("teacherSync").textContent="Tersimpan online"}
    catch(err){console.error(err);$("teacherSync").textContent="Gagal memuat";alert("Gagal memuat panel guru: "+(err.message||err))}
    return
  }
  $("teacherApp").hidden=true;
  $("teacherApp").style.display="none";
  $("app").hidden=false;
  $("app").style.display="block";
  setSync("Memuat data...");
  try{
    await dbLoad();
    draw();
    setSync("Tersimpan online")
  }catch(err){
    console.error("ADMIN DB LOAD ERROR:",err);
    setSync("Database belum siap");
    console.error("Panel Admin terbuka, tetapi data online belum berhasil dimuat:",err);
  }
}
window.startApp=startApp;
(async function init(){
  try{
    var cfg=await apiConfig();
    if(!cfg.url||!cfg.key)throw new Error("SUPABASE_URL atau SUPABASE_PUBLISHABLE_KEY belum diatur di Vercel.");
    sb=window.supabase.createClient(cfg.url,cfg.key);
    var r=await sb.auth.getSession();
    await startApp(r.data.session);
    sb.auth.onAuthStateChange(function(event,session){
      console.log("AUTH EVENT:",event);
      if(event==="SIGNED_OUT"){
        startApp(null);
        return;
      }
      if((event==="SIGNED_IN"||event==="TOKEN_REFRESHED")&&session&&session.user){
        /* SIGNED_IN setelah klik login sudah ditangani oleh jeniusLoginSubmit.
           TOKEN_REFRESHED hanya membuka kembali panel jika belum ada sesi ativa. */
        if(event==="SIGNED_IN") return;
        if(lastStartedSessionId!==session.user.id){
          startApp(session).catch(function(err){
            console.error("AUTH START ERROR:",err);
            var le=document.getElementById("loginErrorV5");if(le){le.textContent="❌ Gagal membuka panel: "+(err.message||err);le.style.display="block"}
          });
        }
      }
    });
  }catch(err){
    console.error("INIT ERROR:",err);
    var le=document.getElementById("loginErrorV5");if(le){le.textContent="❌ "+(err.message||"Konfigurasi gagal");le.style.display="block"}
    var lb=document.getElementById("loginBtnV5");if(lb)lb.disabled=true;
  }
})();