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
