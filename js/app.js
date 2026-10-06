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

async function dbLoad(){
  if(!sb)throw new Error("Koneksi Supabase belum siap.");
  var a;
  try{
    a=await sb.from("students").select("*").order("created_at",{ascending:true});
  }catch(err){
    throw new Error("Gagal menghubungi Supabase saat membaca students: "+(err.message||"Failed to fetch")+". Periksa URL Supabase dan status project.");
  }
  if(a.error)throw new Error("Tabel students: "+a.error.message);
  var b;
  try{b=await sb.from("payments").select("*").order("created_at",{ascending:true})}catch(err){throw new Error("Gagal menghubungi Supabase saat membaca payments: "+(err.message||"Failed to fetch"))}
  if(b.error)throw new Error("Tabel payments: "+b.error.message);
  var c;
  try{c=await sb.from("expenses").select("*").order("created_at",{ascending:true})}catch(err){throw new Error("Gagal menghubungi Supabase saat membaca expenses: "+(err.message||"Failed to fetch"))}
  if(c.error)throw new Error("Tabel expenses: "+c.error.message);
  var d;
  try{d=await sb.from("invoices").select("*").order("created_at",{ascending:true})}catch(err){throw new Error("Gagal menghubungi Supabase saat membaca invoices: "+(err.message||"Failed to fetch"))}
  if(d.error)throw new Error("Tabel invoices: "+d.error.message);
  var at=await sb.from("teacher_attendance").select("*").order("tanggal",{ascending:false}).order("created_at",{ascending:false});
  if(at.error){console.warn("Rekap absensi belum tersedia:",at.error.message);ADMIN_ATT=[];$("attendanceAdminSync").textContent="Tabel absensi belum dibuat"}else{ADMIN_ATT=at.data||[];$("attendanceAdminSync").textContent="Tersimpan di Supabase"}
  S=(a.data||[]).map(function(x){return {id:x.id,nama:x.nama,jenjang:x.jenjang,kelas:x.kelas,ortu:x.ortu,hp:x.hp,biaya:Number(x.biaya||0)}});
  P=(b.data||[]).map(function(x){return {id:x.id,sid:x.student_id,bulan:x.bulan,jumlah:Number(x.jumlah||0),metode:x.metode||"",status:x.status||"Belum",tglLunas:x.tanggal_bayar?String(x.tanggal_bayar).slice(0,10):undefined}});
  E=(c.data||[]).map(function(x){return {id:x.id,tgl:x.tanggal,kat:x.kategori||"",ket:x.keterangan||"",jumlah:Number(x.jumlah||0)}});
  INV=d.data||[];
  var sg=await sb.from("teacher_salaries").select("*").order("bulan",{ascending:false}).order("created_at",{ascending:false});
  if(sg.error){console.warn("Sistem gaji belum tersedia:",sg.error.message);SAL=[]}else SAL=sg.data||[];
  var si=await sb.from("teacher_salary_items").select("*").order("created_at",{ascending:true});
  if(si.error){console.warn("Komponen gaji belum tersedia:",si.error.message);SALITEMS=[]}else SALITEMS=si.data||[];
  var ta=await sb.rpc("get_teacher_accounts");
  if(ta.error){console.warn("Master data guru belum tersedia:",ta.error.message);TEACHERS=[];$("teacherMasterSync").textContent="Jalankan SQL teacher_profiles.sql di Supabase"}else{TEACHERS=ta.data||[];$("teacherMasterSync").textContent="Tersimpan online"}
}
/* Teacher data loading and core rendering moved to ./teacher.js */


async function downloadExcel(filename,sheets){try{if(!window.XLSX){await new Promise(function(resolve,reject){var s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";s.onload=resolve;s.onerror=function(){reject(new Error("Library Excel gagal dimuat. Periksa koneksi internet."))};document.head.appendChild(s)})}var wb=XLSX.utils.book_new();Object.keys(sheets).forEach(function(name){var rows=sheets[name];var ws=XLSX.utils.json_to_sheet(rows.length?rows:[{}]);XLSX.utils.book_append_sheet(wb,ws,name.slice(0,31))});XLSX.writeFile(wb,filename)}catch(err){alert(err.message||"Gagal membuat file Excel.")}}
function downloadExpenseReceipt(id){
  var x=E.find(function(q){return q.id===id});
  if(!x)return;
  var no="EXP-"+String(x.id).replace(/-/g,"").slice(0,8).toUpperCase();
  var html='<!doctype html><html><head><meta charset="utf-8"><title>Struk Pengeluaran '+no+'</title><style>body{font-family:Arial,sans-serif;max-width:700px;margin:30px auto;padding:25px;color:#15436B}h1{margin:0 0 4px;font-size:24px}h2{text-align:center;margin:30px 0 20px}.box{border:1px solid #ccc;border-radius:10px;padding:18px}.row{display:flex;justify-content:space-between;border-bottom:1px solid #eee;padding:10px 0}.total{font-size:20px;font-weight:bold}.foot{margin-top:50px;display:flex;justify-content:space-between;text-align:center}.sig{width:180px;border-top:1px solid #777;padding-top:8px}@media print{body{margin:0}}</style></head><body><h1>JENIUS EDU</h1><div>Dokumen Pengeluaran</div><h2>STRUK PENGELUARAN</h2><div class="box"><div class="row"><span>No. Transaksi</span><b>'+esc(no)+'</b></div><div class="row"><span>Tanggal</span><b>'+esc(x.tgl||"")+'</b></div><div class="row"><span>Kategori</span><b>'+esc(x.kat||"")+'</b></div><div class="row"><span>Keterangan</span><b>'+esc(x.ket||"")+'</b></div><div class="row total"><span>Total Pengeluaran</span><span>'+rp(x.jumlah)+'</span></div></div><div class="foot"><div><div style="height:55px"></div><div class="sig">Penerima / Pengelola</div></div><div><div style="height:55px"></div><div class="sig">Jenius Edu</div></div></div></body></html>';
  var blob=new Blob([html],{type:"text/html;charset=utf-8"});
  var url=URL.createObjectURL(blob);
  var a=document.createElement("a");a.href=url;a.download="Struk_Pengeluaran_"+no+".html";document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},1000);
}
function exportAdminExcel(){var students=S.map(function(x){return {ID:x.id,Nama:x.nama,Jenjang:x.jenjang,Kelas_Mapel:x.kelas,Orang_Tua:x.ortu,WhatsApp:x.hp,Biaya_Bulanan:x.biaya}});var payments=P.map(function(x){var m=stu(x.sid)||{};return {ID:x.id,Nama_Murid:m.nama||"",Bulan:x.bulan,Jumlah:x.jumlah,Metode:x.metode,Status:x.status,Tanggal_Lunas:x.tglLunas||""}});var expenses=E.map(function(x){return {ID:x.id,Tanggal:x.tgl,Kategori:x.kat,Keterangan:x.ket,Jumlah:x.jumlah}});var invoices=INV.map(function(x){var p=P.find(function(q){return q.id===x.payment_id})||{},m=stu(p.sid)||{};return {ID:x.id,Nomor_Invoice:x.nomor_invoice,Tanggal:x.tanggal_invoice,Nama_Murid:m.nama||"",Bulan:p.bulan||"",Total:x.total,Status:x.status}});downloadExcel("Jenius_Edu_Admin_"+todayISO+".xlsx",{"Murid":students,"Pembayaran":payments,"Pengeluaran":expenses,"Invoice":invoices});}
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

async function showInv(x){
  var m=stu(x.sid)||{}, inv=INV.find(function(q){return q.payment_id===x.id});
  var no=(inv&&inv.nomor_invoice)||invoiceNo(x),tgl=x.tglLunas||todayISO;
  if(!inv){
    var r=await sb.from("invoices").insert({payment_id:x.id,nomor_invoice:no,tanggal_invoice:tgl,total:Number(x.jumlah||0),status:"LUNAS"}).select().single();
    if(r.error){alert("Invoice gagal disimpan: "+r.error.message);return}
    INV.push(r.data)
  }
  var old=$("invoiceModal");if(old)old.remove();
  var div=document.createElement("div");div.id="invoiceModal";div.className="invoice-modal";  div.innerHTML='<div class="invoice-box"><div class="invoice-head"><div><h1 style="margin:0">JENIUS EDU</h1><small>Pembayaran Bimbingan Belajar</small></div><div style="text-align:right"><b>INVOICE</b><br><span>'+esc(no)+'</span></div></div><div class="invoice-meta"><div><small>Nama Siswa</small><br><b>'+esc(m.nama||"-")+'</b></div><div><small>Tanggal Pembayaran</small><br><b>'+esc(tgl)+'</b></div><div><small>Jenjang / Kelas</small><br><b>'+esc((m.jenjang||"-")+" / "+(m.kelas||"-"))+'</b></div><div><small>Periode</small><br><b>'+esc(x.bulan||"-")+'</b></div><div><small>Metode Pembayaran</small><br><b>'+esc(x.metode||"-")+'</b></div><div><small>Status</small><br><span class="invoice-paid">LUNAS</span></div></div><hr style="border:0;border-top:1px solid var(--line);margin:18px 0"><div style="display:flex;justify-content:space-between;gap:10px"><b>Pembayaran Bimbel Bulanan</b><b class="invoice-total">'+rp(x.jumlah)+'</b></div><p style="color:var(--muted);margin-top:18px">Terima kasih telah mempercayai Jenius Edu.</p><div class="invoice-actions"><button id="closeInv">Tutup</button><button id="printInv" class="pri">Cetak / Simpan PDF</button><a class="btn pri" target="_blank" rel="noopener" href="'+wa(m.hp,"Halo "+(m.nama||"")+", berikut invoice pembayaran Jenius Edu "+no+" untuk periode "+(x.bulan||"")+" sebesar "+rp(x.jumlah)+". Status: LUNAS. Terima kasih.")+'">WhatsApp</a></div></div>';
  document.body.appendChild(div);$("closeInv").onclick=function(){div.remove()};$("printInv").onclick=function(){window.print()}
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