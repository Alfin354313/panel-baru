/* Jenius Edu admin module. */

var editingStudentId=null;
function startEditStudent(id){
  var m=stu(id);if(!m)return;
  editingStudentId=id;
  $("mmTitle").textContent="Edit data murid";
  $("fmSubmit").textContent="Simpan perubahan";
  $("cancelEdit").hidden=false;
  var f=$("fm");
  f.nama.value=m.nama||"";f.jenjang.value=m.jenjang||"SD";f.kelas.value=m.kelas||"";
  f.ortu.value=m.ortu||"";f.hp.value=m.hp||"";f.biaya.value=m.biaya||0;
  if($("studentFormPanel"))$("studentFormPanel").hidden=false;
  f.scrollIntoView({behavior:"smooth",block:"start"});
}
function cancelEditStudent(){
  editingStudentId=null;
  $("fm").reset();
  $("mmTitle").textContent="Tambah murid";
  $("fmSubmit").textContent="Simpan murid";
  $("cancelEdit").hidden=true;
  if($("studentFormPanel"))$("studentFormPanel").hidden=true;
}
$("cancelEdit").onclick=cancelEditStudent;
if($("openStudentForm"))$("openStudentForm").onclick=function(){var p=$("studentFormPanel");if(!p)return;if(!p.hidden){p.hidden=true;return}editingStudentId=null;$("fm").reset();$("mmTitle").textContent="Tambah murid";$("fmSubmit").textContent="Simpan murid";$("cancelEdit").hidden=true;p.hidden=false;};

$("fm").onsubmit=async function(e){
  e.preventDefault();var o=fd(e.target);
  if(editingStudentId){
    var r=await window.sb.from("students").update({nama:o.nama,jenjang:o.jenjang,kelas:o.kelas,ortu:o.ortu,hp:o.hp,biaya:Number(o.biaya||0)}).eq("id",editingStudentId).select().single();
    if(r.error){alert("Gagal memperbarui murid: "+r.error.message);return}
    var i=S.findIndex(function(x){return x.id===editingStudentId});
    if(i>=0)S[i]={id:r.data.id,nama:r.data.nama,jenjang:r.data.jenjang,kelas:r.data.kelas,ortu:r.data.ortu,hp:r.data.hp,biaya:Number(r.data.biaya||0)};
    cancelEditStudent();draw();alert("Data murid berhasil diperbarui.");
    return;
  }
  var r=await window.sb.from("students").insert({nama:o.nama,jenjang:o.jenjang,kelas:o.kelas,ortu:o.ortu,hp:o.hp,biaya:Number(o.biaya||0)}).select().single();
  if(r.error){alert("Gagal menyimpan murid: "+r.error.message);return}
  S.push({id:r.data.id,nama:r.data.nama,jenjang:r.data.jenjang,kelas:r.data.kelas,ortu:r.data.ortu,hp:r.data.hp,biaya:Number(r.data.biaya||0)});auditLog("CREATE","Murid",r.data.id,"Menambahkan murid "+(r.data.nama||""));
  e.target.reset();if($("studentFormPanel"))$("studentFormPanel").hidden=true;draw();alert("Murid berhasil disimpan.")
};

/* Admin payment form handler. */
$("fp").onsubmit=async function(e){
  e.preventDefault();var o=fd(e.target);
  var r=await window.sb.from("payments").insert({student_id:o.sid,bulan:o.bulan,jumlah:Number(o.jumlah||0),metode:o.metode||"",status:"Belum"}).select().single();
  if(r.error){alert("Gagal menyimpan pembayaran: "+r.error.message);return}
  P.push({id:r.data.id,sid:r.data.student_id,bulan:r.data.bulan,jumlah:Number(r.data.jumlah),metode:r.data.metode||"",status:r.data.status});
  $("fb").value=o.bulan;e.target.reset();if($("paymentFormPanel"))$("paymentFormPanel").hidden=true;draw();alert("Pembayaran berhasil dicatat.")
};

/* Admin expense form handler. */
$("fe").onsubmit=async function(e){
  e.preventDefault();var o=fd(e.target);
  var r=await window.sb.from("expenses").insert({tanggal:o.tgl,kategori:o.kat||"",keterangan:o.ket||"",jumlah:Number(o.jumlah||0)}).select().single();
  if(r.error){alert("Gagal menyimpan pengeluaran: "+r.error.message);return}
  E.push({id:r.data.id,tgl:r.data.tanggal,kat:r.data.kategori||"",ket:r.data.keterangan||"",jumlah:Number(r.data.jumlah||0)});
  $("eb").value=String(o.tgl).slice(0,7);e.target.reset();$("et").value=todayISO;draw();alert("Pengeluaran berhasil dicatat.")
};

/* Admin payment delegated actions: delete, status/invoice, view invoice. */
document.addEventListener("click",async function(e){
  var id=e.target.dataset;
  if(id.dp&&confirm("Hapus catatan pembayaran ini?")){
    var r=await window.sb.from("payments").delete().eq("id",id.dp);
    if(r.error){alert("Gagal menghapus pembayaran: "+r.error.message);return}
    auditLog("DELETE","Pembayaran",id.dp,"Menghapus catatan pembayaran");P=P.filter(function(x){return x.id!==id.dp});INV=INV.filter(function(x){return x.payment_id!==id.dp});draw()
  }
  if(id.tp){
    var x=P.find(function(q){return q.id===id.tp});
    if(x){
      var newStatus=x.status==="Lunas"?"Belum":"Lunas";
      var payload={status:newStatus,tanggal_bayar:newStatus==="Lunas"?todayISO:null};
      var r=await window.sb.from("payments").update(payload).eq("id",x.id);
      if(r.error){alert("Gagal mengubah status: "+r.error.message);return}
      x.status=newStatus;auditLog("UPDATE","Pembayaran",x.id,"Mengubah status pembayaran menjadi "+newStatus);
      if(newStatus==="Lunas"){
        x.tglLunas=todayISO;
        var no=invoiceNo(x);
        var ir=await window.sb.from("invoices").insert({payment_id:x.id,nomor_invoice:no,tanggal_invoice:todayISO,total:Number(x.jumlah||0),status:"LUNAS"}).select().single();
        if(ir.error){alert("Pembayaran sudah Lunas, tetapi invoice gagal disimpan: "+ir.error.message);return}
        INV.push(ir.data);draw();await showInv(x)
      }else{
        delete x.tglLunas;
        var dr=await window.sb.from("invoices").delete().eq("payment_id",x.id);
        if(dr.error){alert("Status sudah diubah, tetapi invoice gagal dihapus: "+dr.error.message);return}
        INV=INV.filter(function(q){return q.payment_id!==x.id});draw()
      }
    }
  }
  if(id.iv){var x=P.find(function(q){return q.id===id.iv});if(x)await showInv(x)}
});

/* Admin student and expense delegated actions. */
document.addEventListener("click",async function(e){
  var id=e.target.dataset;
  if(id.es){startEditStudent(id.es);return}
  if(id.ds&&confirm("Hapus murid ini?")){
    var r=await window.sb.from("students").delete().eq("id",id.ds);
    if(r.error){alert("Gagal menghapus murid: "+r.error.message);return}
    auditLog("DELETE","Murid",id.ds,"Menghapus data murid");S=S.filter(function(x){return x.id!==id.ds});P=P.filter(function(x){return x.sid!==id.ds});INV=INV.filter(function(x){var p=P.find(function(q){return q.id===x.payment_id});return !!p});draw()
  }
  if(id.er){downloadExpenseReceipt(id.er);return}
  if(id.de&&confirm("Hapus pengeluaran ini?")){
    var r=await window.sb.from("expenses").delete().eq("id",id.de);
    if(r.error){alert("Gagal menghapus pengeluaran: "+r.error.message);return}
    auditLog("DELETE","Pengeluaran",id.de,"Menghapus catatan pengeluaran");E=E.filter(function(x){return x.id!==id.de});draw()
  }
});

/* Admin teacher salary module. */
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
  return window.sb.from("teacher_salaries").update({status:next,tanggal_bayar:next==="Sudah Dibayar"?todayISO:null}).eq("id",id).select().single().then(function(r){if(r.error){alert("Gagal mengubah status gaji: "+r.error.message);return}var i=SAL.findIndex(function(q){return q.id===id});if(i>=0)SAL[i]=r.data;drawSalary()});
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
  var q=oldId?await window.sb.from("teacher_salaries").update(payload).eq("id",oldId).select().single():await window.sb.from("teacher_salaries").insert(payload).select().single();
  if(q.error){alert("Gaji belum bisa disimpan: "+q.error.message);return}
  if(oldId)SAL=SAL.map(function(x){return x.id===oldId?q.data:x});else SAL.unshift(q.data);
  if(oldId){var del=await window.sb.from("teacher_salary_items").delete().eq("salary_id",oldId);if(del.error){alert("Gaji tersimpan, tetapi komponen lama gagal diperbarui: "+del.error.message);return}}
  if(items.length){var rows=items.map(function(x){return Object.assign({salary_id:q.data.id},x)}),ins=await window.sb.from("teacher_salary_items").insert(rows).select();if(ins.error){alert("Gaji tersimpan, tetapi komponen tambahan gagal disimpan: "+ins.error.message);return}SALITEMS=SALITEMS.filter(function(x){return x.salary_id!==q.data.id}).concat(ins.data||[])}else SALITEMS=SALITEMS.filter(function(x){return x.salary_id!==q.data.id});
  resetSalaryForm();drawSalary();alert(oldId?"Gaji berhasil diperbarui.":"Gaji berhasil disimpan.");
};

/* Admin salary delegated actions. */
document.addEventListener("click",async function(e){
  var id=e.target.dataset;
  if(id.esal){editSalary(id.esal);return}
  if(id.ssal){showSalarySlip(id.ssal);return}
  if(id.psal){await markSalaryPaid(id.psal);return}
  if(id.dsal&&confirm("Hapus data gaji ini?")){var sr=await window.sb.from("teacher_salaries").delete().eq("id",id.dsal);if(sr.error){alert("Gagal menghapus gaji: "+sr.error.message);return}SAL=SAL.filter(function(x){return x.id!==id.dsal});SALITEMS=SALITEMS.filter(function(x){return x.salary_id!==id.dsal});if(editingSalaryId===id.dsal)resetSalaryForm();drawSalary();return}
});

/* Admin dashboard, rendering, and teacher master. */
function drawAdminAttendance(month){
  var rows=ADMIN_ATT.filter(function(x){return String(x.tanggal||"").slice(0,7)===month});
  var counts={};
  rows.forEach(function(x){
    if(!counts[x.student_id])counts[x.student_id]={Hadir:0,Izin:0,Sakit:0,"Tidak Hadir":0};
    if(counts[x.student_id][x.status]!==undefined)counts[x.student_id][x.status]++;
  });
  var aHadirTopCount=rows.filter(function(x){return x.status==="Hadir"}).length;
  if($("aHadir"))$("aHadir").textContent=aHadirTopCount;if($("aHadirTop"))$("aHadirTop").textContent=aHadirTopCount;
  var aIzinTopCount=rows.filter(function(x){return x.status==="Izin"}).length;
  if($("aIzin"))$("aIzin").textContent=aIzinTopCount;if($("aIzinTop"))$("aIzinTop").textContent=aIzinTopCount;
  var aSakitTopCount=rows.filter(function(x){return x.status==="Sakit"}).length;
  if($("aSakit"))$("aSakit").textContent=aSakitTopCount;if($("aSakitTop"))$("aSakitTop").textContent=aSakitTopCount;
  var aTidakHadirTopCount=rows.filter(function(x){return x.status==="Tidak Hadir"}).length;
  if($("aTidakHadir"))$("aTidakHadir").textContent=aTidakHadirTopCount;if($("aTidakHadirTop"))$("aTidakHadirTop").textContent=aTidakHadirTopCount;
    var attendanceBody=$("attendanceAdminBody");
  if(attendanceBody)attendanceBody.innerHTML=Object.keys(counts).map(function(id){
    var m=stu(id)||{},q=counts[id],total=q.Hadir+q.Izin+q.Sakit+q["Tidak Hadir"];
    return '<tr><td>'+esc(m.nama||"(murid tidak ditemukan)")+'</td><td>'+q.Hadir+'</td><td>'+q.Izin+'</td><td>'+q.Sakit+'</td><td>'+q["Tidak Hadir"]+'</td><td><b>'+total+'</b></td></tr>';
  }).join("")||'<tr><td colspan="6">Belum ada data absensi pada periode ini.</td></tr>';
}
function drawDashboardStudents(){
  var body=$("dashboardStudentBody");if(!body)return;
  var q=(($("dashboardStudentSearch")&&$("dashboardStudentSearch").value)||"").toLowerCase().trim();
  var rows=S.filter(function(m){return !q||[m.nama,m.kelas,m.jenjang].join(" ").toLowerCase().includes(q)}).slice(0,4);
  body.innerHTML=rows.map(function(m){var initials=String(m.nama||"?").trim().split(/\s+/).slice(0,2).map(function(x){return x.charAt(0)}).join("").toUpperCase();return '<tr><td><span class="student-mini-avatar">'+esc(initials)+'</span><b>'+esc(m.nama||"-")+'</b></td><td>'+esc(m.jenjang||"-")+' '+esc(m.kelas||"")+'</td><td>'+esc(m.kelas||m.jenjang||"-")+'</td><td><span class="student-active-badge"><i></i>Aktif</span></td><td><button class="student-more" data-profile="'+m.id+'" aria-label="Detail '+esc(m.nama||"murid")+'">⋮</button></td></tr>'}).join("")||emptyTable(5,"Belum ada murid","Tambahkan murid untuk menampilkan data di dashboard.");
  if($("dashboardStudentCount"))$("dashboardStudentCount").textContent="Menampilkan "+rows.length+" dari "+S.length+" siswa";
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
  drawDashboardStudents();
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
  for(var i=5;i>=0;i--){
    var d=new Date(base.getFullYear(),base.getMonth()-i,1);
    months.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));
  }
  var max=Math.max(1,...months.map(function(m){
    return Math.max(
      P.filter(function(x){return x.bulan===m&&x.status==="Lunas"}).reduce(function(a,x){return a+Number(x.jumlah||0)},0),
      E.filter(function(x){return String(x.tgl).slice(0,7)===m}).reduce(function(a,x){return a+Number(x.jumlah||0)},0)
    );
  }));
  var chartData=months.map(function(m){return {m:m,inc:P.filter(function(x){return x.bulan===m&&x.status==="Lunas"}).reduce(function(s,x){return s+Number(x.jumlah||0)},0),exp:E.filter(function(x){return String(x.tgl).slice(0,7)===m}).reduce(function(s,x){return s+Number(x.jumlah||0)},0)}});
  $("dashboardChart").innerHTML='<div class="finance-chart-grid">'+chartData.map(function(q){var ih=Math.max(3,Math.round(q.inc/max*100)),eh=Math.max(3,Math.round(q.exp/max*100)),label=q.m.slice(5)+"/"+q.m.slice(2,4);return '<div class="finance-month"><div class="finance-bars"><div class="finance-bar income" style="height:'+ih+'%" title="Pendapatan '+rp(q.inc)+'"><span>'+rp(q.inc)+'</span></div><div class="finance-bar expense" style="height:'+eh+'%" title="Pengeluaran '+rp(q.exp)+'"><span>'+rp(q.exp)+'</span></div></div><b>'+label+'</b></div>'}).join("")+'</div>';


  var adminReminderItems=[];if(unpaidCount)adminReminderItems.push('<div class="reminder-item reminder-warn"><span>!</span><div><b>'+unpaidCount+' pembayaran belum lunas</b><small>Total '+rp(receivable)+' pada periode ini.</small></div></div>');var todaySchedules=(typeof SCH!=="undefined"?SCH:[]).filter(function(x){return x.tanggal===todayISO});if(todaySchedules.length)adminReminderItems.push('<div class="reminder-item"><span>▣</span><div><b>'+todaySchedules.length+' jadwal mengajar hari ini</b><small>Pantau aktivitas guru dan murid hari ini.</small></div></div>');$("adminReminderCount").textContent=adminReminderItems.length;$("adminBellDot").hidden=adminReminderItems.length===0;$("adminReminderSummary").innerHTML=adminReminderItems.join("")||'<div class="reminder-clear"><b>Semua aman</b><small>Tidak ada reminder penting untuk periode ini.</small></div>';

  var unpaid=monthPayments.filter(function(x){return x.status!=="Lunas"}).sort(function(a,b){return Number(b.jumlah||0)-Number(a.jumlah||0)});
  $("dashboardUnpaid").innerHTML=unpaid.slice(0,8).map(function(x){
    var m=stu(x.sid)||{};
    return '<div class="dashboard-alert"><div><b>'+esc(m.nama||"(murid tidak ditemukan)")+'</b><br><small>'+esc(x.bulan||"")+' · '+rp(x.jumlah)+'</small></div><a class="btn sm" target="_blank" rel="noopener" href="'+wa(m.hp,"Halo, kami dari Jenius Edu. Mengingatkan pembayaran bimbel "+(m.nama||"")+" bulan "+x.bulan+" sebesar "+rp(x.jumlah)+". Terima kasih.")+'">Ingatkan</a></div>';
  }).join("") || '<p style="color:var(--muted);margin:0">Tidak ada pembayaran yang perlu ditindaklanjuti pada periode ini.</p>';
}
$("dashboardMonth").onchange=drawDashboard;

function draw(){
  var sq=($("studentSearch").value||"").toLowerCase(),sl=$("studentLevelFilter").value;var filteredStudents=S.filter(function(m){return (!sl||m.jenjang===sl)&&(!sq||[m.nama,m.kelas,m.ortu,m.hp].join(" ").toLowerCase().includes(sq))});$("bm").innerHTML=filteredStudents.map(function(m,idx){var initials=(m.nama||"?").trim().split(/\\s+/).slice(0,2).map(function(x){return x.charAt(0)}).join("").toUpperCase();return '<tr><td class="student-no">'+(idx+1)+'</td><td><button class="student-name-cell" data-profile="'+m.id+'"><span class="student-avatar">'+esc(initials)+'</span><b>'+esc(m.nama)+'</b></button></td><td>'+esc(m.jenjang||"-")+'</td><td>'+esc((m.kelas&&String(m.kelas).toLowerCase()!=="semua")?m.kelas:"-")+'</td><td><span class="student-active-badge"><i></i>Aktif</span></td><td><div class="student-row-actions"><button class="student-more" type="button" aria-label="Aksi murid">•••</button><div class="student-action-menu"><button data-profile="'+m.id+'">Detail</button><button data-es="'+m.id+'">Edit</button><button data-ds="'+m.id+'">Hapus</button></div></div></td></tr>'}).join("")||emptyTable(6,"Belum ada murid","Tambahkan murid dengan tombol Tambah Murid.");
  var keep=$("sel").value;$("sel").innerHTML=S.map(function(m){return '<option value="'+m.id+'">'+esc(m.nama)+'</option>'}).join("");if(keep)$("sel").value=keep;
  var f=$("fb").value,pq=($("paymentSearch").value||"").toLowerCase(),ps=$("paymentStatusFilter").value,L=P.filter(function(x){var m=stu(x.sid)||{};return x.bulan===f&&(!ps||x.status===ps)&&(!pq||(m.nama||"").toLowerCase().includes(pq))}),tm=P.filter(function(x){return x.bulan===thisM});
  var received=tm.filter(function(x){return x.status==="Lunas"}).reduce(function(a,x){return a+Number(x.jumlah)},0),unpaid=tm.filter(function(x){return x.status!=="Lunas"}).reduce(function(a,x){return a+Number(x.jumlah)},0),em=E.filter(function(x){return String(x.tgl).slice(0,7)===thisM}).reduce(function(a,x){return a+Number(x.jumlah)},0);
  /* Statistik utama sekarang ditampilkan oleh Dashboard Utama. */
  var ef=$("eb").value,eq=($("expenseSearch").value||"").toLowerCase(),EL=E.filter(function(x){return String(x.tgl).slice(0,7)===ef&&(!eq||[x.kat,x.ket].join(" ").toLowerCase().includes(eq))}).sort(function(a,b){return a.tgl<b.tgl?1:-1});$("et2").textContent="Total pengeluaran bulan ini: "+rp(EL.reduce(function(a,x){return a+Number(x.jumlah)},0));
  $("be").innerHTML=EL.map(function(x){return '<tr><td>'+esc(x.tgl)+'</td><td>'+esc(x.kat)+'</td><td>'+esc(x.ket)+'</td><td>'+rp(x.jumlah)+'</td><td><button class="sm" data-er="'+x.id+'">Unduh Struk</button> <button class="sm" data-de="'+x.id+'">Hapus</button></td></tr>'}).join("")||emptyTable(5,"Belum ada pengeluaran","Tidak ada pengeluaran pada periode atau pencarian ini.");
  if($("paymentBillTotal"))$("paymentBillTotal").textContent=rp(L.reduce(function(a,x){return a+Number(x.jumlah||0)},0));
  if($("paymentPaidTotal"))$("paymentPaidTotal").textContent=rp(L.filter(function(x){return x.status==="Lunas"}).reduce(function(a,x){return a+Number(x.jumlah||0)},0));
  if($("paymentUnpaidTotal"))$("paymentUnpaidTotal").textContent=rp(L.filter(function(x){return x.status!=="Lunas"}).reduce(function(a,x){return a+Number(x.jumlah||0)},0));
  $("bp").innerHTML=L.map(function(x,idx){var m=stu(x.sid)||{};var initials=(m.nama||"?").trim().split(/\\s+/).slice(0,2).map(function(v){return v.charAt(0)}).join("").toUpperCase();var rem=x.status==="Lunas"?'<button class="sm" data-iv="'+x.id+'">Invoice</button>':'<a class="btn sm" target="_blank" rel="noopener" href="'+wa(m.hp,"Halo, kami dari Jenius Edu. Mengingatkan pembayaran bimbel "+(m.nama||"")+" bulan "+x.bulan+" sebesar "+rp(x.jumlah)+". Terima kasih.")+'">Ingatkan</a>';return '<tr><td class="payment-no">'+(idx+1)+'</td><td><span class="payment-student"><span class="payment-avatar">'+esc(initials)+'</span><b>'+esc(m.nama||"(dihapus)")+'</b></span></td><td>'+esc(x.bulan)+'</td><td><b>'+rp(x.jumlah)+'</b></td><td><span class="payment-status '+(x.status==="Lunas"?"paid":"unpaid")+'">'+esc(x.status==="Lunas"?"Lunas":"Belum Lunas")+'</span></td><td><div class="payment-actions"><button class="sm" data-tp="'+x.id+'">'+(x.status==="Lunas"?"Tandai belum":"Tandai lunas")+'</button>'+rem+'<button class="sm danger" data-dp="'+x.id+'">Hapus</button></div></td></tr>'}).join("")||emptyTable(6,"Belum ada pembayaran","Tidak ada pembayaran pada periode atau filter ini.");
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
  var tq=($("teacherSearch").value||"").toLowerCase(),ts=$("teacherStatusFilter").value;var visibleTeachers=TEACHERS.filter(function(x){return (!ts||x.status===ts)&&(!tq||[x.nama,x.email,x.mapel,x.hp].join(" ").toLowerCase().includes(tq))});
  $("teacherMasterBody").innerHTML=visibleTeachers.map(function(x){
    return '<tr><td><b>'+esc(x.nama||"Belum diisi")+'</b></td><td>'+esc(x.email||"")+'</td><td>'+esc(x.hp||"-")+'</td><td>'+esc(x.mapel||"-")+'</td><td class="'+(x.status==="Aktif"?"ok":"no")+'">'+esc(x.status||"Aktif")+'</td><td><button class="sm" data-teacher-profile="'+x.id+'">Detail</button> <button class="sm" data-etm="'+x.id+'">Edit</button></td></tr>';
  }).join("")||emptyTable(6,"Belum ada data guru","Akun Guru yang tersedia akan tampil di sini.");
}
$("teacherAccountId").onchange=syncTeacherMasterForm;
$("teacherMasterReset").onclick=function(){syncTeacherMasterForm()};
$("teacherMasterForm").onsubmit=async function(e){
  e.preventDefault();
  var id=$("teacherAccountId").value;
  if(!id){alert("Belum ada akun Guru.");return}
  var payload={id:id,nama:$("teacherMasterName").value.trim(),email:$("teacherMasterEmail").value.trim(),hp:$("teacherMasterHp").value.trim(),mapel:$("teacherMasterMapel").value.trim(),status:$("teacherMasterStatus").value,catatan:$("teacherMasterNote").value.trim()};
  if(!payload.nama){alert("Nama guru wajib diisi.");return}
  var r=await window.sb.from("teacher_profiles").upsert(payload,{onConflict:"id"}).select().single();
  if(r.error){alert("Data guru belum bisa disimpan: "+r.error.message);return}
  var i=TEACHERS.findIndex(function(x){return x.id===id});
  auditLog("UPDATE","Guru",id,"Menyimpan profil guru "+payload.nama);if(i>=0)TEACHERS[i]=Object.assign({},TEACHERS[i],r.data);else TEACHERS.push(Object.assign({},r.data));
  $("teacherMasterSync").textContent="Data guru tersimpan";
  drawTeachers();drawSalary();
  alert("Data guru berhasil disimpan.");
};
document.addEventListener("click",function(e){
  var b=e.target.closest("[data-etm]");
  if(b){$("teacherAccountId").value=b.getAttribute("data-etm");syncTeacherMasterForm();$("teacherMasterForm").scrollIntoView({behavior:"smooth",block:"start"})}
});

/* Admin data loading. */
async function dbLoad(){
  showAdminLoading();
  if(!window.sb)throw new Error("Koneksi Supabase belum siap.");
  var a;
  try{
    a=await window.sb.from("students").select("*").order("created_at",{ascending:true});
  }catch(err){
    throw new Error("Gagal menghubungi Supabase saat membaca students: "+(err.message||"Failed to fetch")+". Periksa URL Supabase dan status project.");
  }
  if(a.error)throw new Error("Tabel students: "+a.error.message);
  var b;
  try{b=await window.sb.from("payments").select("*").order("created_at",{ascending:true})}catch(err){throw new Error("Gagal menghubungi Supabase saat membaca payments: "+(err.message||"Failed to fetch"))}
  if(b.error)throw new Error("Tabel payments: "+b.error.message);
  var c;
  try{c=await window.sb.from("expenses").select("*").order("created_at",{ascending:true})}catch(err){throw new Error("Gagal menghubungi Supabase saat membaca expenses: "+(err.message||"Failed to fetch"))}
  if(c.error)throw new Error("Tabel expenses: "+c.error.message);
  var d;
  try{d=await window.sb.from("invoices").select("*").order("created_at",{ascending:true})}catch(err){throw new Error("Gagal menghubungi Supabase saat membaca invoices: "+(err.message||"Failed to fetch"))}
  if(d.error)throw new Error("Tabel invoices: "+d.error.message);
  var at=await window.sb.from("teacher_attendance").select("*").order("tanggal",{ascending:false}).order("created_at",{ascending:false});
  if(at.error){console.warn("Rekap absensi belum tersedia:",at.error.message);ADMIN_ATT=[];if($("attendanceAdminSync"))$("attendanceAdminSync").textContent="Tabel absensi belum dibuat"}else{ADMIN_ATT=at.data||[];if($("attendanceAdminSync"))$("attendanceAdminSync").textContent="Tersimpan di Supabase"}
  S=(a.data||[]).map(function(x){return {id:x.id,nama:x.nama,jenjang:x.jenjang,kelas:x.kelas,ortu:x.ortu,hp:x.hp,biaya:Number(x.biaya||0)}});
  P=(b.data||[]).map(function(x){return {id:x.id,sid:x.student_id,bulan:x.bulan,jumlah:Number(x.jumlah||0),metode:x.metode||"",status:x.status||"Belum",tglLunas:x.tanggal_bayar?String(x.tanggal_bayar).slice(0,10):undefined}});
  E=(c.data||[]).map(function(x){return {id:x.id,tgl:x.tanggal,kat:x.kategori||"",ket:x.keterangan||"",jumlah:Number(x.jumlah||0)}});
  INV=d.data||[];
  var sg=await window.sb.from("teacher_salaries").select("*").order("bulan",{ascending:false}).order("created_at",{ascending:false});
  if(sg.error){console.warn("Sistem gaji belum tersedia:",sg.error.message);SAL=[]}else SAL=sg.data||[];
  var si=await window.sb.from("teacher_salary_items").select("*").order("created_at",{ascending:true});
  if(si.error){console.warn("Komponen gaji belum tersedia:",si.error.message);SALITEMS=[]}else SALITEMS=si.data||[];
  var ta=await window.sb.rpc("get_teacher_accounts");
  if(ta.error){console.warn("Master data guru belum tersedia:",ta.error.message);TEACHERS=[];$("teacherMasterSync").textContent="Jalankan SQL teacher_profiles.sql di Supabase"}else{TEACHERS=ta.data||[];$("teacherMasterSync").textContent="Tersimpan online"}
}

/* Admin receipts/export utilities. */
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

/* Admin invoice modal. */
async function showInv(x){
  var m=stu(x.sid)||{},inv=INV.find(function(q){return q.payment_id===x.id}),no=(inv&&inv.nomor_invoice)||invoiceNo(x),tgl=x.tglLunas||todayISO;
  if(!inv){var r=await window.sb.from("invoices").insert({payment_id:x.id,nomor_invoice:no,tanggal_invoice:tgl,total:Number(x.jumlah||0),status:"LUNAS"}).select().single();if(r.error){alert("Invoice gagal disimpan: "+r.error.message);return}INV.push(r.data)}
  var old=$("invoiceModal");if(old)old.remove();var div=document.createElement("div");div.id="invoiceModal";div.className="invoice-modal";
  div.innerHTML='<div class="invoice-box professional-invoice"><button type="button" class="invoice-close-x" aria-label="Tutup invoice">×</button><div class="invoice-brand"><div class="invoice-brand-left"><img src="./assets/jenius-edu-logo.png" alt="Logo Jenius Edu"><div><h1>JENIUS EDU</h1><small>Scientia Potentia Est</small></div></div><div class="invoice-title"><b>KWITANSI PEMBAYARAN</b><span>'+esc(no)+'</span></div></div><div class="invoice-status-line"><span>BUKTI PEMBAYARAN RESMI</span><strong>LUNAS</strong></div><div class="invoice-meta modern"><div><small>Nama Murid</small><b>'+esc(m.nama||"-")+'</b></div><div><small>Tanggal Pembayaran</small><b>'+esc(tgl)+'</b></div><div><small>Jenjang / Kelas</small><b>'+esc((m.jenjang||"-")+" / "+(m.kelas||"-"))+'</b></div><div><small>Periode Belajar</small><b>'+esc(x.bulan||"-")+'</b></div><div><small>Metode</small><b>'+esc(x.metode||"-")+'</b></div><div><small>No. Kwitansi</small><b>'+esc(no)+'</b></div></div><div class="invoice-detail"><div><span>Pembayaran Bimbingan Belajar</span><small>Jenius Edu · Periode '+esc(x.bulan||"-")+'</small></div><b>'+rp(x.jumlah)+'</b></div><div class="invoice-grand"><span>Total Pembayaran</span><strong>'+rp(x.jumlah)+'</strong></div><div class="invoice-foot"><div><b>Terima kasih.</b><small>Pembayaran telah diterima oleh Jenius Edu. Dokumen ini dibuat secara elektronik dan dapat digunakan sebagai bukti pembayaran.</small></div><div class="invoice-stamp">LUNAS<small>JENIUS EDU</small></div></div><div class="invoice-actions"><button id="closeInv">Tutup</button><button id="printInv" class="pri">Cetak / Simpan PDF</button><button id="downloadInv" class="pri">Download PDF</button><a class="btn pri" target="_blank" rel="noopener" href="'+wa(m.hp,"Halo "+(m.nama||"")+", pembayaran Jenius Edu periode "+(x.bulan||"")+" sebesar "+rp(x.jumlah)+" sudah diterima. No. kwitansi: "+no+". Status: LUNAS. Terima kasih.")+'">Kirim WhatsApp</a></div></div>';
  document.body.appendChild(div);var closeInvoice=function(){document.removeEventListener("keydown",escClose);if(div&&div.parentNode)div.parentNode.removeChild(div)};var closeBtn=div.querySelector("#closeInv"),closeX=div.querySelector(".invoice-close-x");if(closeBtn)closeBtn.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();closeInvoice()});if(closeX)closeX.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();closeInvoice()});div.addEventListener("mousedown",function(e){if(e.target===div)closeInvoice()});var escClose=function(e){if(e.key==="Escape")closeInvoice()};document.addEventListener("keydown",escClose);$("printInv").onclick=function(){window.print()};$("downloadInv").onclick=function(){downloadInvoicePdf(x,no,tgl,m)}
}
function downloadInvoicePdf(x,no,tgl,m){
  if(!window.jspdf||!window.jspdf.jsPDF){alert("Library PDF belum siap. Periksa koneksi internet lalu coba lagi.");return}
  var doc=new window.jspdf.jsPDF({unit:"mm",format:"a4"}),left=20,right=190,y=22;
  doc.setFont("helvetica","bold");doc.setTextColor(23,76,113);doc.setFontSize(21);doc.text("JENIUS EDU",left,y);doc.setFontSize(13);doc.text("KWITANSI PEMBAYARAN",right,y,{align:"right"});y+=7;
  doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(100,120,135);doc.text("Bimbingan Belajar · Scientia Potentia Est",left,y);doc.text(no,right,y,{align:"right"});y+=10;
  doc.setDrawColor(205,220,230);doc.line(left,y,right,y);y+=10;
  function meta(label,value,xp){doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(105,120,135);doc.text(label,xp,y);doc.setFont("helvetica","bold");doc.setFontSize(10);doc.setTextColor(35,65,85);doc.text(String(value||"-"),xp,y+5)}
  meta("NAMA MURID",m.nama,left);meta("TANGGAL PEMBAYARAN",tgl,110);y+=16;meta("JENJANG / KELAS",(m.jenjang||"-")+" / "+(m.kelas||"-"),left);meta("PERIODE",x.bulan,110);y+=16;meta("METODE",x.metode,left);meta("STATUS","LUNAS",110);y+=18;
  doc.setFillColor(245,249,252);doc.roundedRect(left,y-5,170,20,3,3,"F");doc.setFontSize(10);doc.setFont("helvetica","normal");doc.setTextColor(45,70,90);doc.text("Pembayaran Bimbingan Belajar",left+5,y+4);doc.setFont("helvetica","bold");doc.text(rp(x.jumlah),right-5,y+4,{align:"right"});y+=28;
  doc.setFontSize(11);doc.text("TOTAL PEMBAYARAN",left,y);doc.setFontSize(18);doc.setTextColor(22,120,80);doc.text(rp(x.jumlah),right,y,{align:"right"});y+=12;doc.setDrawColor(205,220,230);doc.line(left,y,right,y);y+=10;
  doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(100,115,130);doc.text("Pembayaran telah diterima oleh Jenius Edu. Dokumen elektronik ini dapat digunakan sebagai bukti pembayaran.",left,y,{maxWidth:125});doc.setFont("helvetica","bold");doc.setTextColor(22,120,80);doc.setFontSize(12);doc.text("LUNAS",right,y,{align:"right"});
  doc.save("Kwitansi-Jenius-Edu-"+String(no).replace(/[^a-z0-9-]/gi,"-")+".pdf")
}

/* Admin top navigation and export binding. */
document.querySelectorAll("#app .top-menu .tabs button").forEach(function(b){
  b.onclick=function(){
    document.querySelectorAll("#app .top-menu .tabs button").forEach(function(x){x.classList.toggle("on",x===b)});
    ["d","m","p","e","u","g","r","a"].forEach(function(k){
      var el=k==="d"?$("dashboard"):k==="g"?$("salaryPage"):k==="u"?$("teacherMasterPage"):k==="r"?$("financialReportPage"):k==="a"?$("auditLogPage"):$("t"+k);
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
$("exportAdminBtn").onclick=function(){exportAdminExcel()};

$("adminBell").onclick=function(e){e.stopPropagation();$("adminNotificationPanel").hidden=!$("adminNotificationPanel").hidden};document.addEventListener("click",function(e){if(!$("adminNotificationPanel").hidden&&!$("adminNotificationPanel").contains(e.target))$("adminNotificationPanel").hidden=true});

["studentSearch","paymentSearch","expenseSearch","teacherSearch"].forEach(function(id){$(id).oninput=draw});["studentLevelFilter","paymentStatusFilter","teacherStatusFilter"].forEach(function(id){$(id).onchange=draw});

var activeStudentProfileId=null;
function openStudentProfile(id){
  var m=stu(id);if(!m)return;activeStudentProfileId=id;
  ["dashboard","tm","tp","te","teacherMasterPage","salaryPage"].forEach(function(pid){var el=$(pid);if(el)el.hidden=true});
  $("studentProfilePage").hidden=false;$("studentProfileName").textContent=m.nama||"-";$("studentProfileMeta").textContent=(m.jenjang||"-")+" · "+(m.kelas||"-")+" · Orang tua: "+(m.ortu||"-");
  var pays=P.filter(function(x){return x.sid===id}).sort(function(x,y){return String(y.bulan).localeCompare(String(x.bulan))});
  var paid=pays.filter(function(x){return x.status==="Lunas"}).reduce(function(s,x){return s+Number(x.jumlah||0)},0),due=pays.filter(function(x){return x.status!=="Lunas"}).reduce(function(s,x){return s+Number(x.jumlah||0)},0);
  var att=ATT.filter(function(x){return x.student_id===id}),present=att.filter(function(x){return x.status==="Hadir"}).length;
  $("studentProfileSummary").innerHTML='<div><small>Biaya / bulan</small><b>'+rp(m.biaya)+'</b></div><div><small>Total dibayar</small><b>'+rp(paid)+'</b></div><div><small>Belum lunas</small><b>'+rp(due)+'</b></div><div><small>Kehadiran</small><b>'+present+' / '+att.length+'</b></div>';
  $("studentProfilePayments").innerHTML=pays.slice(0,8).map(function(x){return '<div class="profile-row"><span>'+esc(x.bulan||"-")+'</span><b>'+rp(x.jumlah)+'</b><em class="'+(x.status==="Lunas"?"ok":"no")+'">'+esc(x.status||"-")+'</em></div>'}).join("")||'<p class="profile-empty">Belum ada pembayaran.</p>';
  var counts={Hadir:0,Izin:0,Sakit:0,"Tidak Hadir":0};att.forEach(function(x){counts[x.status]=(counts[x.status]||0)+1});$("studentProfileAttendance").innerHTML='<div class="attendance-mini"><span><b>'+counts.Hadir+'</b>Hadir</span><span><b>'+counts.Izin+'</b>Izin</span><span><b>'+counts.Sakit+'</b>Sakit</span><span><b>'+counts["Tidak Hadir"]+'</b>Tidak hadir</span></div>';
  var notes=TN.filter(function(x){return x.student_id===id}).sort(function(x,y){return String(y.tanggal).localeCompare(String(x.tanggal))});$("studentProfileNotes").innerHTML=notes.slice(0,5).map(function(x){return '<div class="profile-text-row"><b>'+esc(x.tanggal||"-")+' · '+esc(x.mapel||"")+'</b><small>'+esc(x.catatan||x.materi||"-")+'</small></div>'}).join("")||'<p class="profile-empty">Belum ada catatan guru.</p>';
  var reports=RPT.filter(function(x){return x.student_id===id}).sort(function(x,y){return String(y.created_at||y.tanggal||"").localeCompare(String(x.created_at||x.tanggal||""))});$("studentProfileReports").innerHTML=reports.slice(0,5).map(function(x){return '<div class="profile-text-row"><b>'+esc(x.periode||x.tanggal||"Laporan")+'</b><small>'+esc(x.catatan||x.evaluasi||x.perkembangan||"-")+'</small></div>'}).join("")||'<p class="profile-empty">Belum ada laporan perkembangan.</p>';
}
$("studentProfileBack").onclick=function(){$("studentProfilePage").hidden=true;$("tm").hidden=false;activeStudentProfileId=null};
document.addEventListener("click",function(e){var b=e.target.closest("[data-profile]");if(b)openStudentProfile(b.dataset.profile)});

var activeTeacherProfileId=null;
function openTeacherProfile(id){
  var g=TEACHERS.find(function(x){return x.id===id});if(!g)return;activeTeacherProfileId=id;
  ["dashboard","tm","tp","te","teacherMasterPage","salaryPage","studentProfilePage"].forEach(function(pid){var el=$(pid);if(el)el.hidden=true});$("teacherProfilePage").hidden=false;
  $("teacherProfileName").textContent=g.nama||"Guru";$("teacherProfileMeta").textContent=(g.mapel||"Mapel belum diisi")+" · "+(g.status||"Aktif")+" · "+(g.email||"-");
  var schedules=SCH.filter(function(x){return x.teacher_id===id}).sort(function(x,y){return String(y.tanggal).localeCompare(String(x.tanggal))});
  var attendance=ATT.filter(function(x){return x.teacher_id===id}),done=attendance.filter(function(x){return x.status==="Hadir"}).length;
  var salaries=SAL.filter(function(x){return x.teacher_id===id}).sort(function(x,y){return String(y.periode||y.bulan||"").localeCompare(String(x.periode||x.bulan||""))});
  var totalSalary=salaries.reduce(function(s,x){return s+Number(x.total||x.total_gaji||x.jumlah||0)},0);
  var studentIds={};schedules.forEach(function(x){studentIds[x.student_id]=true});
  $("teacherProfileSummary").innerHTML='<div><small>Murid ditangani</small><b>'+Object.keys(studentIds).length+'</b></div><div><small>Total jadwal</small><b>'+schedules.length+'</b></div><div><small>Kehadiran tercatat</small><b>'+done+' / '+attendance.length+'</b></div><div><small>Total gaji tercatat</small><b>'+rp(totalSalary)+'</b></div>';
  $("teacherProfileSchedules").innerHTML=schedules.slice(0,7).map(function(x){var m=stu(x.student_id)||{};return '<div class="profile-text-row"><b>'+esc(x.tanggal||"-")+' · '+esc(x.jam||"")+'</b><small>'+esc(m.nama||"Murid")+' · '+esc(x.mapel||g.mapel||"-")+' · '+esc(x.status||"-")+'</small></div>'}).join("")||'<p class="profile-empty">Belum ada jadwal.</p>';
  var ac={Hadir:0,Izin:0,Sakit:0,"Tidak Hadir":0};attendance.forEach(function(x){ac[x.status]=(ac[x.status]||0)+1});$("teacherProfileAttendance").innerHTML='<div class="attendance-mini"><span><b>'+ac.Hadir+'</b>Hadir</span><span><b>'+ac.Izin+'</b>Izin</span><span><b>'+ac.Sakit+'</b>Sakit</span><span><b>'+ac["Tidak Hadir"]+'</b>Tidak hadir</span></div>';
  $("teacherProfileSalary").innerHTML=salaries.slice(0,7).map(function(x){var val=Number(x.total||x.total_gaji||x.jumlah||0);return '<div class="profile-row"><span>'+esc(x.periode||x.bulan||"-")+'</span><b>'+rp(val)+'</b><em class="'+((x.status||"").toLowerCase()==="lunas"?"ok":"no")+'">'+esc(x.status||"-")+'</em></div>'}).join("")||'<p class="profile-empty">Belum ada riwayat gaji.</p>';
  $("teacherProfileNote").innerHTML='<div class="profile-contact"><span>📱 '+esc(g.hp||"-")+'</span><p>'+esc(g.catatan||"Belum ada catatan profil guru.")+'</p></div>';
}
$("teacherProfileBack").onclick=function(){$("teacherProfilePage").hidden=true;$("teacherMasterPage").hidden=false;activeTeacherProfileId=null};
document.addEventListener("click",function(e){var b=e.target.closest("[data-teacher-profile]");if(b)openTeacherProfile(b.dataset.teacherProfile)});

function financialReportData(){
  var month=$("financialReportMonth").value||thisM;
  var paid=P.filter(function(x){return x.bulan===month&&x.status==="Lunas"}),expenses=E.filter(function(x){return String(x.tgl||"").slice(0,7)===month});
  var income=paid.reduce(function(s,x){return s+Number(x.jumlah||0)},0),expense=expenses.reduce(function(s,x){return s+Number(x.jumlah||0)},0);
  var unpaid=P.filter(function(x){return x.bulan===month&&x.status!=="Lunas"}).reduce(function(s,x){return s+Number(x.jumlah||0)},0);
  return {month:month,paid:paid,expenses:expenses,income:income,expense:expense,profit:income-expense,unpaid:unpaid}
}
function drawFinancialReport(){
  var d=financialReportData();$("financialReportKpi").innerHTML='<div><small>Pendapatan</small><b>'+rp(d.income)+'</b></div><div><small>Pengeluaran</small><b>'+rp(d.expense)+'</b></div><div><small>Laba / Rugi</small><b class="'+(d.profit>=0?"ok":"no")+'">'+rp(d.profit)+'</b></div><div><small>Piutang</small><b>'+rp(d.unpaid)+'</b></div>';
  var margin=d.income?Math.round(d.profit/d.income*100):0;$("financialReportSummary").innerHTML='<div class="report-metric"><span>Transaksi lunas</span><b>'+d.paid.length+'</b></div><div class="report-metric"><span>Jumlah pengeluaran</span><b>'+d.expenses.length+'</b></div><div class="report-metric"><span>Margin bersih</span><b>'+margin+'%</b></div>';
  var cats={};d.expenses.forEach(function(x){cats[x.kat||"Lainnya"]=(cats[x.kat||"Lainnya"]||0)+Number(x.jumlah||0)});var sorted=Object.keys(cats).sort(function(x,y){return cats[y]-cats[x]});$("financialExpenseBreakdown").innerHTML=sorted.map(function(k){var pct=d.expense?Math.round(cats[k]/d.expense*100):0;return '<div class="expense-break"><div><span>'+esc(k)+'</span><b>'+rp(cats[k])+'</b></div><div><i style="width:'+pct+'%"></i></div><small>'+pct+'%</small></div>'}).join("")||'<p class="profile-empty">Belum ada pengeluaran pada periode ini.</p>';
  var rows=d.paid.map(function(x){var m=stu(x.sid)||{};return {date:x.tglLunas||x.bulan,type:"Pendapatan",desc:"Pembayaran "+(m.nama||"Murid")+" · "+(x.metode||"-"),inc:Number(x.jumlah||0),out:0}}).concat(d.expenses.map(function(x){return {date:x.tgl,type:"Pengeluaran",desc:(x.kat||"-")+" · "+(x.ket||"-"),inc:0,out:Number(x.jumlah||0)}})).sort(function(x,y){return String(y.date).localeCompare(String(x.date))});
  $("financialReportBody").innerHTML=rows.map(function(x){return '<tr><td>'+esc(x.date||"-")+'</td><td><span class="finance-type '+(x.inc?"income":"expense")+'">'+x.type+'</span></td><td>'+esc(x.desc)+'</td><td class="ok">'+(x.inc?rp(x.inc):"-")+'</td><td class="no">'+(x.out?rp(x.out):"-")+'</td></tr>'}).join("")||'<tr><td colspan="5">Belum ada transaksi pada periode ini.</td></tr>';
}
$("financialReportMonth").value=thisM;$("financialReportMonth").onchange=drawFinancialReport;
document.querySelector('[data-t="r"]').addEventListener("click",drawFinancialReport);
$("financialReportCsv").onclick=function(){var d=financialReportData(),rows=[["Periode","Jenis","Keterangan","Masuk","Keluar"]];d.paid.forEach(function(x){var m=stu(x.sid)||{};rows.push([x.bulan,"Pendapatan","Pembayaran "+(m.nama||"Murid"),Number(x.jumlah||0),0])});d.expenses.forEach(function(x){rows.push([x.tgl,"Pengeluaran",(x.kat||"")+" - "+(x.ket||""),0,Number(x.jumlah||0)])});rows.push(["","TOTAL","",d.income,d.expense],["","LABA/RUGI","",d.profit,""]);var csv=rows.map(function(r){return r.map(function(v){return '"'+String(v==null?"":v).replace(/"/g,'""')+'"'}).join(",")}).join("\n"),blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download="Laporan-Keuangan-Jenius-Edu-"+d.month+".csv";link.click();setTimeout(function(){URL.revokeObjectURL(url)},500)};
$("financialReportPdf").onclick=function(){var d=financialReportData();if(!window.jspdf||!window.jspdf.jsPDF){alert("Library PDF belum siap.");return}var doc=new window.jspdf.jsPDF({unit:"mm",format:"a4"}),y=20;doc.setFont("helvetica","bold");doc.setTextColor(23,76,113);doc.setFontSize(20);doc.text("JENIUS EDU",20,y);y+=8;doc.setFontSize(14);doc.text("LAPORAN KEUANGAN",20,y);y+=7;doc.setFont("helvetica","normal");doc.setFontSize(9);doc.setTextColor(100,115,130);doc.text("Periode: "+d.month,20,y);y+=12;[["Pendapatan",d.income],["Pengeluaran",d.expense],["Laba / Rugi",d.profit],["Piutang",d.unpaid]].forEach(function(r){doc.setFont("helvetica","normal");doc.setTextColor(60,75,90);doc.text(r[0],20,y);doc.setFont("helvetica","bold");doc.text(rp(r[1]),190,y,{align:"right"});y+=8});y+=3;doc.setDrawColor(210,220,230);doc.line(20,y,190,y);y+=9;doc.setFont("helvetica","bold");doc.setTextColor(23,76,113);doc.text("RINCIAN PENGELUARAN",20,y);y+=8;var cats={};d.expenses.forEach(function(x){cats[x.kat||"Lainnya"]=(cats[x.kat||"Lainnya"]||0)+Number(x.jumlah||0)});Object.keys(cats).forEach(function(k){doc.setFont("helvetica","normal");doc.setTextColor(60,75,90);doc.text(k,20,y);doc.setFont("helvetica","bold");doc.text(rp(cats[k]),190,y,{align:"right"});y+=7});doc.save("Laporan-Keuangan-Jenius-Edu-"+d.month+".pdf")};

async function loadAuditLog(){$("auditLogBody").innerHTML=tableSkeleton(5);var r=await window.sb.from("audit_logs").select("*").order("created_at",{ascending:false}).limit(300);if(r.error){$("auditLogBody").innerHTML='<tr><td colspan="5">Audit log belum tersedia. Jalankan SQL Tahap 8 di Supabase.</td></tr>';return}AUDIT=r.data||[];drawAuditLog()}
function drawAuditLog(){var q=($("auditSearch").value||"").toLowerCase(),f=$("auditActionFilter").value,rows=AUDIT.filter(function(x){return (!f||x.action===f)&&(!q||[x.user_email,x.action,x.module,x.detail].join(" ").toLowerCase().includes(q))});$("auditLogBody").innerHTML=rows.map(function(x){var dt=x.created_at?new Date(x.created_at).toLocaleString("id-ID"):"-";return '<tr><td>'+esc(dt)+'</td><td>'+esc(x.user_email||"-")+'<br><small>'+esc(x.role||"")+'</small></td><td><span class="audit-action '+String(x.action||"").toLowerCase()+'">'+esc(x.action||"-")+'</span></td><td>'+esc(x.module||"-")+'</td><td>'+esc(x.detail||"-")+'</td></tr>'}).join("")||emptyTable(5,"Belum ada aktivitas","Aktivitas baru atau hasil pencarian akan tampil di sini.")}
$("refreshAuditLog").onclick=loadAuditLog;$("auditSearch").oninput=drawAuditLog;$("auditActionFilter").onchange=drawAuditLog;document.querySelector('[data-t="a"]').addEventListener("click",loadAuditLog);

function tableSkeleton(cols){return '<tr class="skeleton-row"><td colspan="'+cols+'"><div class="skeleton-line w90"></div><div class="skeleton-line w70"></div><div class="skeleton-line w80"></div></td></tr>'}
function emptyTable(cols,title,desc){return '<tr><td colspan="'+cols+'"><div class="empty-state"><div class="empty-state-icon">⌁</div><b>'+esc(title)+'</b><span>'+esc(desc)+'</span></div></td></tr>'}
function showAdminLoading(){[["bm",7],["bp",6],["be",5],["teacherMasterBody",6]].forEach(function(x){var el=$(x[0]);if(el)el.innerHTML=tableSkeleton(x[1])});var sync=$("syncStatus");if(sync)sync.textContent="Memuat data..."}

if($("dashboardStudentSearch"))$("dashboardStudentSearch").oninput=drawDashboardStudents;
if($("dashboardAddStudent"))$("dashboardAddStudent").onclick=function(){document.querySelector('[data-t="m"]').click();setTimeout(function(){var n=$("nama");if(n)n.focus()},0)};

/* Pembayaran form toggle */
if($("openPaymentForm"))$("openPaymentForm").onclick=function(){var p=$("paymentFormPanel");if(!p)return;if(!p.hidden){p.hidden=true;return}p.hidden=false;if($("pb"))$("pb").value=$("fb").value||thisM;};
