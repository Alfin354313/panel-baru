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

function drawAdminAttendance(month){
  var rows=ADMIN_ATT.filter(function(x){return String(x.tanggal||"").slice(0,7)===month});
  var counts={};
  rows.forEach(function(x){
    if(!counts[x.student_id])counts[x.student_id]={Hadir:0,Izin:0,Sakit:0,"Tidak Hadir":0};
    if(counts[x.student_id][x.status]!==undefined)counts[x.student_id][x.status]++;
  });
  $("aHadir").textContent=rows.filter(function(x){return x.status==="Hadir"}).length;
  $("aIzin").textContent=rows.filter(function(x){return x.status==="Izin"}).length;
  $("aSakit").textContent=rows.filter(function(x){return x.status==="Sakit"}).length;
  $("aTidakHadir").textContent=rows.filter(function(x){return x.status==="Tidak Hadir"}).length;
  $("attendanceAdminBody").innerHTML=Object.keys(counts).map(function(id){
    var m=stu(id)||{},q=counts[id],total=q.Hadir+q.Izin+q.Sakit+q["Tidak Hadir"];
    return '<tr><td>'+esc(m.nama||"(murid tidak ditemukan)")+'</td><td>'+q.Hadir+'</td><td>'+q.Izin+'</td><td>'+q.Sakit+'</td><td>'+q["Tidak Hadir"]+'</td><td><b>'+total+'</b></td></tr>';
  }).join("")||'<tr><td colspan="6">Belum ada data absensi pada periode ini.</td></tr>';
}
function drawDashboard(){
  var month=$("dashboardMonth").value||thisM;
  var monthPayments=P.filter(function(x){return x.bulan===month});
  var income=monthPayments.filter(function(x){return x.status==="Lunas"}).reduce(function(a,x){return a+Number(x.jumlah||0)},0);
  var receivable=monthPayments.filter(function(x){return x.status!=="Lunas"}).reduce(function(a,x){return a+Number(x.jumlah||0)},0);
  var expense=E.filter(function(x){return String(x.tgl).slice(0,7)===month}).reduce(function(a,x){return a+Number(x.jumlah||0)},0);
  var paidCount=monthPayments.filter(function(x){return x.status==="Lunas"}).length;
  var unpaidCount=monthPayments.filter(function(x){return x.status!=="Lunas"}).length;
  var billCount=monthPayments.length;
  var paidRate=billCount?Math.round(paidCount/billCount*100):0;
  var average=billCount?monthPayments.reduce(function(a,x){return a+Number(x.jumlah||0)},0)/billCount:0;
  $("dStudents").textContent=S.length;
  $("dIncome").textContent=rp(income);
  $("dReceivable").textContent=rp(receivable);
  $("dExpense").textContent=rp(expense);
  $("dProfit").textContent=rp(income-expense);
  $("dPaidCount").textContent=paidCount;
  $("dUnpaidCount").textContent=unpaidCount;
  $("dBillCount").textContent=billCount;
  $("dPaidRate").textContent=paidRate+"%";
  $("dAverage").textContent=rp(average);
  drawAdminAttendance(month);

  var months=[];
  var base=new Date(month+"-01T00:00:00");
  for(var i=2;i>=0;i--){
    var d=new Date(base.getFullYear(),base.getMonth()-i,1);
    months.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));
  }
  var max=Math.max(1,...months.map(function(m){
    return Math.max(
      P.filter(function(x){return x.bulan===m&&x.status==="Lunas"}).reduce(function(a,x){return a+Number(x.jumlah||0)},0),
      E.filter(function(x){return String(x.tgl).slice(0,7)===m}).reduce(function(a,x){return a+Number(x.jumlah||0)},0)
    );
  }));
  $("dashboardChart").innerHTML=months.map(function(m){
    var inc=P.filter(function(x){return x.bulan===m&&x.status==="Lunas"}).reduce(function(a,x){return a+Number(x.jumlah||0)},0);
    var exp=E.filter(function(x){return String(x.tgl).slice(0,7)===m}).reduce(function(a,x){return a+Number(x.jumlah||0)},0);
    var pct=Math.max(2,Math.round(inc/max*100));
    var label=m.slice(5)+"/"+m.slice(0,4);
    return '<div class="chart-row"><span class="chart-label">'+label+'</span><div class="chart-track" title="Pendapatan '+rp(inc)+'"><div class="chart-bar" style="width:'+pct+'%"></div></div><span class="chart-value">'+rp(inc)+'</span></div><div class="chart-row"><span style="color:var(--muted)">Keluar</span><div class="chart-track" title="Pengeluaran '+rp(exp)+'"><div class="chart-bar" style="width:'+Math.max(2,Math.round(exp/max*100))+'%"></div></div><span class="chart-value">'+rp(exp)+'</span></div>';
  }).join("");

  var unpaid=monthPayments.filter(function(x){return x.status!=="Lunas"}).sort(function(a,b){return Number(b.jumlah||0)-Number(a.jumlah||0)});
  $("dashboardUnpaid").innerHTML=unpaid.slice(0,8).map(function(x){
    var m=stu(x.sid)||{};
    return '<div class="dashboard-alert"><div><b>'+esc(m.nama||"(murid tidak ditemukan)")+'</b><br><small>'+esc(x.bulan||"")+' · '+rp(x.jumlah)+'</small></div><a class="btn sm" target="_blank" rel="noopener" href="'+wa(m.hp,"Halo, kami dari Jenius Edu. Mengingatkan pembayaran bimbel "+(m.nama||"")+" bulan "+x.bulan+" sebesar "+rp(x.jumlah)+". Terima kasih.")+'">Ingatkan</a></div>';
  }).join("") || '<p style="color:var(--muted);margin:0">Tidak ada pembayaran yang perlu ditindaklanjuti pada periode ini.</p>';
}
$("dashboardMonth").onchange=drawDashboard;

function draw(){
  $("bm").innerHTML=S.map(function(m){return '<tr><td>'+esc(m.nama)+'</td><td>'+esc(m.jenjang)+'</td><td>'+esc(m.kelas)+'</td><td>'+esc(m.ortu)+'</td><td>'+esc(m.hp)+'</td><td>'+rp(m.biaya)+'</td><td><button class="sm" data-es="'+m.id+'">Edit</button> <button class="sm" data-ds="'+m.id+'">Hapus</button></td></tr>'}).join("")||'<tr><td colspan="7">Belum ada murid. Isi formulir di atas.</td></tr>';
  var keep=$("sel").value;$("sel").innerHTML=S.map(function(m){return '<option value="'+m.id+'">'+esc(m.nama)+'</option>'}).join("");if(keep)$("sel").value=keep;
  var f=$("fb").value,L=P.filter(function(x){return x.bulan===f}),tm=P.filter(function(x){return x.bulan===thisM});
  var received=tm.filter(function(x){return x.status==="Lunas"}).reduce(function(a,x){return a+Number(x.jumlah)},0),unpaid=tm.filter(function(x){return x.status!=="Lunas"}).reduce(function(a,x){return a+Number(x.jumlah)},0),em=E.filter(function(x){return String(x.tgl).slice(0,7)===thisM}).reduce(function(a,x){return a+Number(x.jumlah)},0);
  /* Statistik utama sekarang ditampilkan oleh Dashboard Utama. */
  var ef=$("eb").value,EL=E.filter(function(x){return String(x.tgl).slice(0,7)===ef}).sort(function(a,b){return a.tgl<b.tgl?1:-1});$("et2").textContent="Total pengeluaran bulan ini: "+rp(EL.reduce(function(a,x){return a+Number(x.jumlah)},0));
  $("be").innerHTML=EL.map(function(x){return '<tr><td>'+esc(x.tgl)+'</td><td>'+esc(x.kat)+'</td><td>'+esc(x.ket)+'</td><td>'+rp(x.jumlah)+'</td><td><button class="sm" data-er="'+x.id+'">Unduh Struk</button> <button class="sm" data-de="'+x.id+'">Hapus</button></td></tr>'}).join("")||'<tr><td colspan="5">Belum ada pengeluaran untuk bulan ini.</td></tr>';
  $("bp").innerHTML=L.map(function(x){var m=stu(x.sid)||{};var rem=x.status==="Lunas"?'<button class="sm" data-iv="'+x.id+'">Invoice</button>':' <a class="btn sm" target="_blank" rel="noopener" href="'+wa(m.hp,"Halo, kami dari Jenius Edu. Mengingatkan pembayaran bimbel "+(m.nama||"")+" bulan "+x.bulan+" sebesar "+rp(x.jumlah)+". Terima kasih.")+'">Ingatkan</a>';return '<tr><td>'+esc(m.nama||"(dihapus)")+'</td><td>'+esc(x.bulan)+'</td><td>'+rp(x.jumlah)+'</td><td>'+esc(x.metode)+'</td><td class="'+(x.status==="Lunas"?"ok":"no")+'">'+x.status+'</td><td><button class="sm" data-tp="'+x.id+'">'+(x.status==="Lunas"?"Tandai belum":"Tandai lunas")+'</button>'+rem+' <button class="sm" data-dp="'+x.id+'">Hapus</button></td></tr>'}).join("")||'<tr><td colspan="6">Belum ada catatan untuk bulan ini.</td></tr>';
  drawDashboard();
  drawTeachers();
  drawSalary();
}

$("fb").onchange=draw;$("eb").onchange=draw;$("sel").onchange=function(){var m=stu($("sel").value);if(m)$("pj").value=m.biaya};
function teacherAccountLabel(id){
  var t=TEACHERS.find(function(x){return x.id===id})||{};
  return (t.nama||"Belum diisi")+" — "+(t.email||String(id||"").slice(0,8));
}
function populateTeacherAccounts(){
  var keep=$("teacherAccountId").value;
  $("teacherAccountId").innerHTML=TEACHERS.map(function(x){
    return '<option value="'+esc(x.id)+'">'+esc(teacherAccountLabel(x.id))+'</option>';
  }).join("")||'<option value="">Belum ada akun Guru</option>';
  if(keep&&TEACHERS.some(function(x){return x.id===keep}))$("teacherAccountId").value=keep;
  else if(TEACHERS[0])$("teacherAccountId").value=TEACHERS[0].id;
  syncTeacherMasterForm();
}
function syncTeacherMasterForm(){
  var id=$("teacherAccountId").value,t=TEACHERS.find(function(x){return x.id===id})||{};
  $("teacherMasterName").value=t.nama||"";
  $("teacherMasterEmail").value=t.email||"";
  $("teacherMasterHp").value=t.hp||"";
  $("teacherMasterMapel").value=t.mapel||"";
  $("teacherMasterStatus").value=t.status||"Aktif";
  $("teacherMasterNote").value=t.catatan||"";
}
function drawTeachers(){
  populateTeacherAccounts();
  var active=TEACHERS.filter(function(x){return x.status!=="Nonaktif"}).length;
  $("teacherMasterCount").textContent=active;
  $("teacherMasterBody").innerHTML=TEACHERS.map(function(x){
    return '<tr><td><b>'+esc(x.nama||"Belum diisi")+'</b></td><td>'+esc(x.email||"")+'</td><td>'+esc(x.hp||"-")+'</td><td>'+esc(x.mapel||"-")+'</td><td class="'+(x.status==="Aktif"?"ok":"no")+'">'+esc(x.status||"Aktif")+'</td><td><button class="sm" data-etm="'+x.id+'">Edit</button></td></tr>';
  }).join("")||'<tr><td colspan="6">Belum ada akun Guru. Buat akun Guru di Supabase Authentication terlebih dahulu.</td></tr>';
}
$("teacherAccountId").onchange=syncTeacherMasterForm;
$("teacherMasterReset").onclick=function(){syncTeacherMasterForm()};
$("teacherMasterForm").onsubmit=async function(e){
  e.preventDefault();
  var id=$("teacherAccountId").value;
  if(!id){alert("Belum ada akun Guru.");return}
  var payload={id:id,nama:$("teacherMasterName").value.trim(),email:$("teacherMasterEmail").value.trim(),hp:$("teacherMasterHp").value.trim(),mapel:$("teacherMasterMapel").value.trim(),status:$("teacherMasterStatus").value,catatan:$("teacherMasterNote").value.trim()};
  if(!payload.nama){alert("Nama guru wajib diisi.");return}
  var r=await sb.from("teacher_profiles").upsert(payload,{onConflict:"id"}).select().single();
  if(r.error){alert("Data guru belum bisa disimpan: "+r.error.message);return}
  var i=TEACHERS.findIndex(function(x){return x.id===id});
  if(i>=0)TEACHERS[i]=Object.assign({},TEACHERS[i],r.data);else TEACHERS.push(Object.assign({},r.data));
  $("teacherMasterSync").textContent="Data guru tersimpan";
  drawTeachers();drawSalary();
  alert("Data guru berhasil disimpan.");
};
document.addEventListener("click",function(e){
  var b=e.target.closest("[data-etm]");
  if(b){$("teacherAccountId").value=b.getAttribute("data-etm");syncTeacherMasterForm();$("teacherMasterForm").scrollIntoView({behavior:"smooth",block:"start"})}
});
function salaryTeacherIds(){
  var ids={};
  TEACHERS.filter(function(x){return x.status!=="Nonaktif"}).forEach(function(x){if(x.id)ids[x.id]=true});
  ADMIN_ATT.forEach(function(x){if(x.teacher_id)ids[x.teacher_id]=true});
  SAL.forEach(function(x){if(x.teacher_id)ids[x.teacher_id]=true});
  return Object.keys(ids);
}
function salaryMeetingCount(teacherId,month){
  return ADMIN_ATT.filter(function(x){
    return x.teacher_id===teacherId &&
      String(x.tanggal||"").slice(0,7)===month &&
      x.status==="Hadir";
  }).length;
}
function salaryItemTotals(salaryId){
  var items=SALITEMS.filter(function(x){return x.salary_id===salaryId});
  var add=items.filter(function(x){return x.tipe==="Tambahan"}).reduce(function(a,x){return a+Number(x.nominal||0)},0);
  var cut=items.filter(function(x){return x.tipe==="Potongan"}).reduce(function(a,x){return a+Number(x.nominal||0)},0);
  return {items:items,add:add,cut:cut};
}
function salaryCurrentItems(){
  return Array.from(document.querySelectorAll("#salaryItems .salary-item")).map(function(row){
    return {nama_item:row.querySelector(".salary-item-name").value.trim(),tipe:row.querySelector(".salary-item-type").value,nominal:Number(row.querySelector(".salary-item-nominal").value||0)};
  }).filter(function(x){return x.nama_item});
}
function addSalaryItemRow(item){
  var row=document.createElement("div");row.className="salary-item";
  row.innerHTML='<label>Nama item<input class="salary-item-name" value="'+esc(item&&item.nama_item||"")+'" placeholder="Contoh: Lembur"></label><label>Jenis<select class="salary-item-type"><option>Tambahan</option><option>Potongan</option></select></label><label>Nominal<input class="salary-item-nominal" type="number" min="0" value="'+Number(item&&item.nominal||0)+'"></label><button type="button" class="sm salary-item-remove">Hapus</button>';
  if(item&&item.tipe)row.querySelector(".salary-item-type").value=item.tipe;
  row.querySelectorAll("input,select").forEach(function(el){el.oninput=updateSalaryPreview});
  row.querySelector(".salary-item-remove").onclick=function(){row.remove();updateSalaryPreview()};
  $("salaryItems").appendChild(row);
}
function salaryTeacherLabel(id){
  var t=TEACHERS.find(function(x){return x.id===id});
  if(t&&t.nama)return t.nama;
  var s=SAL.find(function(x){return x.teacher_id===id&&x.teacher_name});
  if(s)return s.teacher_name;
  return "Guru • "+String(id||"").slice(0,8);
}
function populateSalaryTeachers(){
  var keep=$("salaryTeacher").value;
  var ids=salaryTeacherIds();
  $("salaryTeacher").innerHTML=ids.map(function(id){return '<option value="'+esc(id)+'">'+esc(salaryTeacherLabel(id))+'</option>'}).join("")||'<option value="">Belum ada data guru</option>';
  if(keep&&ids.indexOf(keep)>=0)$("salaryTeacher").value=keep;
  else if(ids[0])$("salaryTeacher").value=ids[0];
}
function updateSalaryMeeting(){
  var id=$("salaryTeacher").value,month=$("salaryFormMonth").value;
  var count=id&&month?salaryMeetingCount(id,month):0;
  $("salaryMeetings").value=count;
  updateSalaryPreview();
}
function updateSalaryPreview(){
  var meetings=Number($("salaryMeetings").value||0),rate=Number($("salaryRate").value||0),bonus=Number($("salaryBonus").value||0);
  var items=salaryCurrentItems(),add=items.filter(function(x){return x.tipe==="Tambahan"}).reduce(function(a,x){return a+x.nominal},0),cut=items.filter(function(x){return x.tipe==="Potongan"}).reduce(function(a,x){return a+x.nominal},0);
  var total=meetings*rate+bonus+add-cut;
  $("salaryGrandTotal").textContent=rp(total);
}
function drawSalary(){
  populateSalaryTeachers();
  var month=$("salaryMonth").value||thisM;
  $("salaryMonth").value=month;
  $("salaryFormMonth").value=month;
  updateSalaryMeeting();
  var monthRows=SAL.filter(function(x){return x.bulan===month});
  var total=monthRows.reduce(function(a,x){return a+Number(x.total_gaji||0)},0);
  var paid=monthRows.filter(function(x){return x.status==="Sudah Dibayar"}).reduce(function(a,x){return a+Number(x.total_gaji||0)},0);
  $("salaryTotal").textContent=rp(total);$("salaryPaid").textContent=rp(paid);$("salaryUnpaid").textContent=rp(total-paid);
  $("salaryBody").innerHTML=monthRows.map(function(x){
    var it=salaryItemTotals(x.id);
    return '<tr><td>'+esc(x.teacher_name||salaryTeacherLabel(x.teacher_id))+'</td><td>'+esc(x.bulan)+'</td><td>'+Number(x.jumlah_pertemuan||0)+'</td><td>'+rp(x.total_pertemuan)+'</td><td>'+rp(x.bonus)+'</td><td>'+rp(x.total_tambahan||it.add)+'</td><td>'+rp(x.total_potongan||it.cut)+'</td><td><b>'+rp(x.total_gaji)+'</b></td><td class="'+(x.status==="Sudah Dibayar"?"salary-status-paid":"salary-status-unpaid")+'">'+esc(x.status)+'</td><td><button class="sm" data-esal="'+x.id+'">Edit</button> <button class="sm" data-ssal="'+x.id+'">Slip Gaji</button> <button class="sm" data-psal="'+x.id+'">'+(x.status==="Sudah Dibayar"?"Tandai Belum":"Tandai Dibayar")+'</button> <button class="sm" data-dsal="'+x.id+'">Hapus</button></td></tr>';
  }).join("")||'<tr><td colspan="10">Belum ada gaji untuk periode ini.</td></tr>';
}
function resetSalaryForm(){
  editingSalaryId=null;$("salaryForm").reset();$("salaryMonth").value=thisM;$("salaryFormMonth").value=thisM;$("salaryRate").value=12500;$("salaryBonus").value=50000;$("salaryItems").innerHTML="";$("salarySubmit").textContent="💾 Simpan Gaji";$("salaryCancel").hidden=true;$("salaryNote").value="";updateSalaryMeeting();drawSalary();
}
function editSalary(id){
  var x=SAL.find(function(q){return q.id===id});if(!x)return;
  editingSalaryId=id;$("salaryTeacher").value=x.teacher_id;$("salaryTeacherName").value=x.teacher_name||"";$("salaryMonth").value=x.bulan;$("salaryFormMonth").value=x.bulan;$("salaryRate").value=Number(x.tarif_pertemuan||12500);$("salaryBonus").value=Number(x.bonus||0);$("salaryNote").value=x.catatan||"";$("salaryItems").innerHTML="";
  SALITEMS.filter(function(q){return q.salary_id===id}).forEach(addSalaryItemRow);
  $("salarySubmit").textContent="💾 Simpan Perubahan";$("salaryCancel").hidden=false;updateSalaryMeeting();$("salaryForm").scrollIntoView({behavior:"smooth",block:"start"});
}
function showSalarySlip(id){
  var x=SAL.find(function(q){return q.id===id});
  if(!x){alert("Data gaji tidak ditemukan.");return}
  var it=salaryItemTotals(id),name=x.teacher_name||salaryTeacherLabel(x.teacher_id),period=reportMonthName(x.bulan)||x.bulan;
  var old=$("salarySlipModal");if(old)old.remove();
  var extra=it.items.filter(function(q){return q.tipe==="Tambahan"});
  var cuts=it.items.filter(function(q){return q.tipe==="Potongan"});
  var extraRows=extra.map(function(q){return '<div style="display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--line)"><span>'+esc(q.nama_item)+'</span><b>'+rp(q.nominal)+'</b></div>'}).join("");
  var cutRows=cuts.map(function(q){return '<div style="display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--line)"><span>'+esc(q.nama_item)+'</span><b>-'+rp(q.nominal)+'</b></div>'}).join("");
  var div=document.createElement("div");div.id="salarySlipModal";div.className="invoice-modal";
  div.innerHTML='<div class="invoice-box"><div class="invoice-head"><div><h1 style="margin:0">JENIUS EDU</h1><small>Honor / Gaji Guru</small></div><div style="text-align:right"><b>SLIP GAJI</b><br><span>JE-SAL-'+esc(String(x.bulan||"").replace("-",""))+'-'+esc(String(x.teacher_id||"").slice(0,6).toUpperCase())+'</span></div></div><div class="invoice-meta"><div><small>Nama Guru</small><br><b>'+esc(name)+'</b></div><div><small>Periode</small><br><b>'+esc(period)+'</b></div><div><small>Jumlah Pertemuan</small><br><b>'+Number(x.jumlah_pertemuan||0)+' pertemuan</b></div><div><small>Tarif / Pertemuan</small><br><b>'+rp(x.tarif_pertemuan)+'</b></div><div><small>Tanggal Bayar</small><br><b>'+esc(x.tanggal_bayar||"-")+'</b></div><div><small>Status</small><br><span class="'+(x.status==="Sudah Dibayar"?"invoice-paid":"salary-status-unpaid")+'">'+esc(x.status||"Belum Dibayar")+'</span></div></div><hr style="border:0;border-top:1px solid var(--line);margin:18px 0"><h3 style="margin:0 0 8px">Rincian Pendapatan</h3><div style="display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--line)"><span>Gaji Pertemuan</span><b>'+rp(x.total_pertemuan)+'</b></div><div style="display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--line)"><span>Bonus</span><b>'+rp(x.bonus)+'</b></div>'+extraRows+(cuts.length?'<h3 style="margin:18px 0 8px">Potongan</h3>'+cutRows:"")+'<div style="display:flex;justify-content:space-between;gap:12px;margin-top:18px;padding:14px 0;border-top:2px solid var(--ink);font-size:1.25rem"><b>TOTAL DITERIMA</b><b class="invoice-total">'+rp(x.total_gaji)+'</b></div>'+(x.catatan?'<div style="margin-top:14px;padding:12px;border:1px solid var(--line);border-radius:10px"><small>Catatan</small><p style="margin:5px 0 0">'+esc(x.catatan)+'</p></div>':"")+'<p style="color:var(--muted);margin-top:18px">Slip ini dibuat secara elektronik oleh Jenius Edu.</p><div class="invoice-actions"><button id="closeSalarySlip">Tutup</button><button id="printSalarySlip" class="pri">Cetak / Simpan PDF</button><button id="downloadSalarySlipBtn">Download PDF</button></div></div>';
  document.body.appendChild(div);
  $("closeSalarySlip").onclick=function(){div.remove()};
  $("printSalarySlip").onclick=function(){window.print()};
  $("downloadSalarySlipBtn").onclick=function(){downloadSalarySlip(id)};
}
function downloadSalarySlip(id){
  var x=SAL.find(function(q){return q.id===id});
  if(!x){alert("Data gaji tidak ditemukan.");return}
  if(!window.jspdf||!window.jspdf.jsPDF){alert("Library PDF belum siap. Periksa koneksi internet lalu coba lagi.");return}
  var it=salaryItemTotals(id),doc=new window.jspdf.jsPDF({unit:"mm",format:"a4"}),left=20,right=190,y=20;
  var name=x.teacher_name||salaryTeacherLabel(x.teacher_id),period=reportMonthName(x.bulan)||x.bulan;
  function money(n){return rp(Number(n||0))}
  function line(){doc.setDrawColor(210,220,230);doc.line(left,y,right,y);y+=7}
  function labelValue(label,value){doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(80,95,110);doc.text(label,left,y);doc.setFont("helvetica","normal");doc.setTextColor(25,55,80);doc.text(String(value||"-"),left+42,y);y+=6}
  function row(label,value){doc.setFont("helvetica","normal");doc.setFontSize(10);doc.setTextColor(45,55,65);doc.text(label,left,y);doc.setFont("helvetica","bold");doc.setTextColor(25,55,80);doc.text(value,right,y,{align:"right"});y+=7}
  doc.setFont("helvetica","bold");doc.setFontSize(20);doc.setTextColor(21,67,107);doc.text("JENIUS EDU",left,y);y+=9;
  doc.setFontSize(14);doc.text("SLIP GAJI GURU",left,y);y+=7;
  doc.setFont("helvetica","normal");doc.setFontSize(9);doc.setTextColor(90,105,120);doc.text("Bukti rincian pembayaran honor/gaji guru",left,y);y+=8;line();
  labelValue("Nama Guru",name);labelValue("Periode",period);labelValue("Status",x.status||"Belum Dibayar");if(x.tanggal_bayar)labelValue("Tanggal Bayar",x.tanggal_bayar);y+=3;
  doc.setFont("helvetica","bold");doc.setFontSize(11);doc.setTextColor(21,67,107);doc.text("RINCIAN PENDAPATAN",left,y);y+=7;
  row("Jumlah Pertemuan",String(Number(x.jumlah_pertemuan||0))+" pertemuan");
  row("Tarif per Pertemuan",money(x.tarif_pertemuan));
  row("Gaji Pertemuan",money(x.total_pertemuan));
  row("Bonus",money(x.bonus));
  it.items.filter(function(q){return q.tipe==="Tambahan"}).forEach(function(q){row(q.nama_item,money(q.nominal))});
  y+=1;line();
  if(it.cut>0){
    doc.setFont("helvetica","bold");doc.setFontSize(11);doc.setTextColor(180,70,50);doc.text("POTONGAN",left,y);y+=7;
    it.items.filter(function(q){return q.tipe==="Potongan"}).forEach(function(q){row(q.nama_item,"-"+money(q.nominal))});
    y+=1;line();
  }
  doc.setFont("helvetica","bold");doc.setFontSize(14);doc.setTextColor(21,67,107);doc.text("TOTAL DITERIMA",left,y);doc.text(money(x.total_gaji),right,y,{align:"right"});y+=10;
  if(x.catatan){doc.setFont("helvetica","bold");doc.setFontSize(10);doc.text("Catatan",left,y);y+=6;var lines=doc.splitTextToSize(String(x.catatan),right-left);doc.setFont("helvetica","normal");doc.setTextColor(65,75,85);doc.text(lines,left,y);y+=lines.length*5+8}
  doc.setDrawColor(210,220,230);doc.line(120,250,190,250);doc.setFont("helvetica","normal");doc.setFontSize(9);doc.setTextColor(90,105,120);doc.text("Jenius Edu",155,256,{align:"center"});doc.text("Slip ini dibuat secara elektronik.",155,262,{align:"center"});
  var safe=String(name).replace(/[^a-zA-Z0-9_-]+/g,"_").replace(/^_+|_+$/g,"")||"Guru";
  doc.save("Slip_Gaji_"+safe+"_"+String(x.bulan||"").replace("-","_")+".pdf");
}
function markSalaryPaid(id){
  var x=SAL.find(function(q){return q.id===id});if(!x)return;
  var next=x.status==="Sudah Dibayar"?"Belum Dibayar":"Sudah Dibayar";
  return sb.from("teacher_salaries").update({status:next,tanggal_bayar:next==="Sudah Dibayar"?todayISO:null}).eq("id",id).select().single().then(function(r){if(r.error){alert("Gagal mengubah status gaji: "+r.error.message);return}var i=SAL.findIndex(function(q){return q.id===id});if(i>=0)SAL[i]=r.data;drawSalary()});
}
$("salaryMonth").onchange=function(){drawSalary()};
$("salaryTeacher").onchange=function(){var x=SAL.find(function(q){return q.teacher_id===$("salaryTeacher").value&&q.bulan===$("salaryFormMonth").value});if(x&&!editingSalaryId)$("salaryTeacherName").value=x.teacher_name||"";updateSalaryMeeting()};
$("salaryFormMonth").onchange=updateSalaryMeeting;
$("salaryRate").oninput=updateSalaryPreview;$("salaryBonus").oninput=updateSalaryPreview;
$("addSalaryItem").onclick=function(){addSalaryItemRow();updateSalaryPreview()};
$("salaryCancel").onclick=resetSalaryForm;
$("salaryForm").onsubmit=async function(e){
  e.preventDefault();if(!currentUser)return;
  var teacherId=$("salaryTeacher").value,month=$("salaryFormMonth").value;
  if(!teacherId){alert("Belum ada data guru dari absensi Panel Guru.");return}
  var meetings=salaryMeetingCount(teacherId,month),rate=Number($("salaryRate").value||12500),bonus=Number($("salaryBonus").value||0),items=salaryCurrentItems();
  var add=items.filter(function(x){return x.tipe==="Tambahan"}).reduce(function(a,x){return a+x.nominal},0),cut=items.filter(function(x){return x.tipe==="Potongan"}).reduce(function(a,x){return a+x.nominal},0),totalMeeting=meetings*rate,total=totalMeeting+bonus+add-cut;
  var payload={teacher_id:teacherId,teacher_name:$("salaryTeacherName").value.trim(),bulan:month,tarif_pertemuan:rate,jumlah_pertemuan:meetings,total_pertemuan:totalMeeting,bonus:bonus,total_tambahan:add,total_potongan:cut,total_gaji:total,catatan:$("salaryNote").value.trim()};
  var oldId=editingSalaryId;
  var q=oldId?await sb.from("teacher_salaries").update(payload).eq("id",oldId).select().single():await sb.from("teacher_salaries").insert(payload).select().single();
  if(q.error){alert("Gaji belum bisa disimpan: "+q.error.message);return}
  if(oldId)SAL=SAL.map(function(x){return x.id===oldId?q.data:x});else SAL.unshift(q.data);
  if(oldId){var del=await sb.from("teacher_salary_items").delete().eq("salary_id",oldId);if(del.error){alert("Gaji tersimpan, tetapi komponen lama gagal diperbarui: "+del.error.message);return}}
  if(items.length){var rows=items.map(function(x){return Object.assign({salary_id:q.data.id},x)}),ins=await sb.from("teacher_salary_items").insert(rows).select();if(ins.error){alert("Gaji tersimpan, tetapi komponen tambahan gagal disimpan: "+ins.error.message);return}SALITEMS=SALITEMS.filter(function(x){return x.salary_id!==q.data.id}).concat(ins.data||[])}else SALITEMS=SALITEMS.filter(function(x){return x.salary_id!==q.data.id});
  resetSalaryForm();drawSalary();alert(oldId?"Gaji berhasil diperbarui.":"Gaji berhasil disimpan.");
};
/* Teacher report rendering, PDF and sharing moved to ./teacher.js */


/* Teacher notes edit/form handlers moved to ./teacher.js */

function fd(f){var o={};new FormData(f).forEach(function(v,k){o[k]=v});return o}

/* Admin student add/edit handlers moved to ./admin.js */


/* Admin payment form handler moved to ./admin.js */

/* Admin expense form handler moved to ./admin.js */

document.addEventListener("click",async function(e){
  var t=e.target,id=t.dataset;
  if(id.es){startEditStudent(id.es);return}
  if(id.ds&&confirm("Hapus murid ini?")){
    var r=await sb.from("students").delete().eq("id",id.ds);
    if(r.error){alert("Gagal menghapus murid: "+r.error.message);return}
    S=S.filter(function(x){return x.id!==id.ds});P=P.filter(function(x){return x.sid!==id.ds});INV=INV.filter(function(x){var p=P.find(function(q){return q.id===x.payment_id});return !!p});draw()
  }
  if(id.dp&&confirm("Hapus catatan pembayaran ini?")){
    var r=await sb.from("payments").delete().eq("id",id.dp);
    if(r.error){alert("Gagal menghapus pembayaran: "+r.error.message);return}
    P=P.filter(function(x){return x.id!==id.dp});INV=INV.filter(function(x){return x.payment_id!==id.dp});draw()
  }
  if(id.esal){editSalary(id.esal);return}
  if(id.ssal){showSalarySlip(id.ssal);return}
  if(id.psal){await markSalaryPaid(id.psal);return}
  if(id.dsal&&confirm("Hapus data gaji ini?")){var sr=await sb.from("teacher_salaries").delete().eq("id",id.dsal);if(sr.error){alert("Gagal menghapus gaji: "+sr.error.message);return}SAL=SAL.filter(function(x){return x.id!==id.dsal});SALITEMS=SALITEMS.filter(function(x){return x.salary_id!==id.dsal});if(editingSalaryId===id.dsal)resetSalaryForm();drawSalary();return}
  if(id.er){downloadExpenseReceipt(id.er);return}
  if(id.de&&confirm("Hapus pengeluaran ini?")){
    var r=await sb.from("expenses").delete().eq("id",id.de);
    if(r.error){alert("Gagal menghapus pengeluaran: "+r.error.message);return}
    E=E.filter(function(x){return x.id!==id.de});draw()
  }
  if(id.tp){
    var x=P.find(function(q){return q.id===id.tp});
    if(x){
      var newStatus=x.status==="Lunas"?"Belum":"Lunas";
      var payload={status:newStatus,tanggal_bayar:newStatus==="Lunas"?todayISO:null};
      var r=await sb.from("payments").update(payload).eq("id",x.id);
      if(r.error){alert("Gagal mengubah status: "+r.error.message);return}
      x.status=newStatus;
      if(newStatus==="Lunas"){
        x.tglLunas=todayISO;
        var no=invoiceNo(x);
        var ir=await sb.from("invoices").insert({payment_id:x.id,nomor_invoice:no,tanggal_invoice:todayISO,total:Number(x.jumlah||0),status:"LUNAS"}).select().single();
        if(ir.error){alert("Pembayaran sudah Lunas, tetapi invoice gagal disimpan: "+ir.error.message);return}
        INV.push(ir.data);draw();await showInv(x)
      }else{
        delete x.tglLunas;
        var dr=await sb.from("invoices").delete().eq("payment_id",x.id);
        if(dr.error){alert("Status sudah diubah, tetapi invoice gagal dihapus: "+dr.error.message);return}
        INV=INV.filter(function(q){return q.payment_id!==x.id});draw()
      }
    }
  }
  if(id.iv){var x=P.find(function(q){return q.id===id.iv});if(x)await showInv(x)}
  if(id.eatt){startEditAttendance(id.eatt);return}
  if(id.datt&&confirm("Hapus data absensi ini?")){
    var ar=await sb.from("teacher_attendance").delete().eq("id",id.datt).eq("teacher_id",currentUser.id);
    if(ar.error){alert("Gagal menghapus absensi: "+ar.error.message);return}
    ATT=ATT.filter(function(x){return x.id!==id.datt});if(editingAttendanceId===id.datt)cancelEditAttendance();drawAttendance();return
  }
  if(id.esched){var z=SCH.find(function(x){return x.id===id.esched});if(z){editingScheduleId=z.id;$("scheduleStudent").value=z.student_id;$("scheduleDate").value=z.tanggal;$("scheduleTime").value=z.jam;$("scheduleMapel").value=z.mapel;$("scheduleStatus").value=z.status;$("scheduleSubmit").textContent="Simpan Perubahan";$("scheduleCancel").hidden=false;window.scrollTo({top:$("scheduleForm").getBoundingClientRect().top+window.scrollY-80,behavior:"smooth"})}return}if(id.dsched){if(confirm("Hapus jadwal ini?")){var dr=await sb.from("teacher_schedules").delete().eq("id",id.dsched).eq("teacher_id",currentUser.id);if(dr.error)alert(dr.error.message);else{SCH=SCH.filter(function(x){return x.id!==id.dsched});drawSchedule()}}return}if(id.etn){startEditTeacher(id.etn);return}
  if(id.ereport){showReport(id.ereport);return}if(id.pdfReport){var px=RPT.find(function(x){return x.id===id.pdfReport});if(px){var pf=downloadReportPdf(px.student_id,px.bulan);if(pf)savePdfBlob(pf)}return}if(id.shareReport){var sx=RPT.find(function(x){return x.id===id.shareReport});if(sx){shareReportWhatsApp(sx.student_id,sx.bulan)}return}if(id.dreport&&confirm("Hapus laporan bulanan ini?")){var rr=await sb.from("teacher_reports").delete().eq("id",id.dreport).eq("teacher_id",currentUser.id);if(rr.error){alert("Gagal menghapus laporan: "+rr.error.message);return}RPT=RPT.filter(function(x){return x.id!==id.dreport});if(editingReportId===id.dreport)cancelEditReport();drawReports();return}if(id.tn&&confirm("Hapus catatan pembelajaran ini?")){var r=await sb.from("teacher_notes").delete().eq("id",id.tn).eq("teacher_id",currentUser.id);if(r.error){alert("Gagal menghapus catatan: "+r.error.message);return}TN=TN.filter(function(x){return x.id!==id.tn});if(editingTeacherId===id.tn)cancelEditTeacher();drawTeacher();alert("Catatan pembelajaran berhasil dihapus.")}
});

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