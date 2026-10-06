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
  f.scrollIntoView({behavior:"smooth",block:"start"});
}
function cancelEditStudent(){
  editingStudentId=null;
  $("fm").reset();
  $("mmTitle").textContent="Tambah murid";
  $("fmSubmit").textContent="Simpan murid";
  $("cancelEdit").hidden=true;
}
$("cancelEdit").onclick=cancelEditStudent;

$("fm").onsubmit=async function(e){
  e.preventDefault();var o=fd(e.target);
  if(editingStudentId){
    var r=await sb.from("students").update({nama:o.nama,jenjang:o.jenjang,kelas:o.kelas,ortu:o.ortu,hp:o.hp,biaya:Number(o.biaya||0)}).eq("id",editingStudentId).select().single();
    if(r.error){alert("Gagal memperbarui murid: "+r.error.message);return}
    var i=S.findIndex(function(x){return x.id===editingStudentId});
    if(i>=0)S[i]={id:r.data.id,nama:r.data.nama,jenjang:r.data.jenjang,kelas:r.data.kelas,ortu:r.data.ortu,hp:r.data.hp,biaya:Number(r.data.biaya||0)};
    cancelEditStudent();draw();alert("Data murid berhasil diperbarui.");
    return;
  }
  var r=await sb.from("students").insert({nama:o.nama,jenjang:o.jenjang,kelas:o.kelas,ortu:o.ortu,hp:o.hp,biaya:Number(o.biaya||0)}).select().single();
  if(r.error){alert("Gagal menyimpan murid: "+r.error.message);return}
  S.push({id:r.data.id,nama:r.data.nama,jenjang:r.data.jenjang,kelas:r.data.kelas,ortu:r.data.ortu,hp:r.data.hp,biaya:Number(r.data.biaya||0)});
  e.target.reset();draw();alert("Murid berhasil disimpan.")
};

/* Admin payment form handler. */
$("fp").onsubmit=async function(e){
  e.preventDefault();var o=fd(e.target);
  var r=await sb.from("payments").insert({student_id:o.sid,bulan:o.bulan,jumlah:Number(o.jumlah||0),metode:o.metode||"",status:"Belum"}).select().single();
  if(r.error){alert("Gagal menyimpan pembayaran: "+r.error.message);return}
  P.push({id:r.data.id,sid:r.data.student_id,bulan:r.data.bulan,jumlah:Number(r.data.jumlah),metode:r.data.metode||"",status:r.data.status});
  $("fb").value=o.bulan;draw();alert("Pembayaran berhasil dicatat.")
};

/* Admin expense form handler. */
$("fe").onsubmit=async function(e){
  e.preventDefault();var o=fd(e.target);
  var r=await sb.from("expenses").insert({tanggal:o.tgl,kategori:o.kat||"",keterangan:o.ket||"",jumlah:Number(o.jumlah||0)}).select().single();
  if(r.error){alert("Gagal menyimpan pengeluaran: "+r.error.message);return}
  E.push({id:r.data.id,tgl:r.data.tanggal,kat:r.data.kategori||"",ket:r.data.keterangan||"",jumlah:Number(r.data.jumlah||0)});
  $("eb").value=String(o.tgl).slice(0,7);e.target.reset();$("et").value=todayISO;draw();alert("Pengeluaran berhasil dicatat.")
};

/* Admin payment delegated actions: delete, status/invoice, view invoice. */
document.addEventListener("click",async function(e){
  var id=e.target.dataset;
  if(id.dp&&confirm("Hapus catatan pembayaran ini?")){
    var r=await sb.from("payments").delete().eq("id",id.dp);
    if(r.error){alert("Gagal menghapus pembayaran: "+r.error.message);return}
    P=P.filter(function(x){return x.id!==id.dp});INV=INV.filter(function(x){return x.payment_id!==id.dp});draw()
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
});

/* Admin student and expense delegated actions. */
document.addEventListener("click",async function(e){
  var id=e.target.dataset;
  if(id.es){startEditStudent(id.es);return}
  if(id.ds&&confirm("Hapus murid ini?")){
    var r=await sb.from("students").delete().eq("id",id.ds);
    if(r.error){alert("Gagal menghapus murid: "+r.error.message);return}
    S=S.filter(function(x){return x.id!==id.ds});P=P.filter(function(x){return x.sid!==id.ds});INV=INV.filter(function(x){var p=P.find(function(q){return q.id===x.payment_id});return !!p});draw()
  }
  if(id.er){downloadExpenseReceipt(id.er);return}
  if(id.de&&confirm("Hapus pengeluaran ini?")){
    var r=await sb.from("expenses").delete().eq("id",id.de);
    if(r.error){alert("Gagal menghapus pengeluaran: "+r.error.message);return}
    E=E.filter(function(x){return x.id!==id.de});draw()
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
