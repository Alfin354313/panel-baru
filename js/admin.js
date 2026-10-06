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
