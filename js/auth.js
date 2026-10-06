/* Jenius Edu authentication UI and login flow. */

function setLoginMode(role){
  loginRole=role;
  var admin=document.getElementById("adminModeBtnV5"),guru=document.getElementById("guruModeBtnV5"),sub=document.getElementById("loginSubtitleV5"),btn=document.getElementById("loginBtnV5"),err=document.getElementById("loginErrorV5");
  if(admin)admin.classList.toggle("active",role==="admin");
  if(guru)guru.classList.toggle("active",role==="guru");
  if(sub)sub.textContent=role==="guru"?"Masuk ke Panel Guru":"Masuk ke Panel Pengelola";
  if(btn)btn.textContent=role==="guru"?"Masuk sebagai Guru":"Masuk sebagai Admin";
  if(err){err.style.display="none";err.textContent=""}
}
function normalizeRole(role){
  role=String(role||"").trim().toLowerCase();
  if(role==="teacher"||role==="guru")return "guru";
  if(role==="administrator"||role==="pengelola"||role==="admin")return "admin";
  return role;
}
async function jeniusLoginSubmitV5(){
  var emailEl=document.getElementById("loginEmailV5"),passEl=document.getElementById("loginPasswordV5"),btn=document.getElementById("loginBtnV5"),err=document.getElementById("loginErrorV5");
  if(!emailEl||!passEl||!btn||!err)return;
  var email=(emailEl.value||"").trim(),password=passEl.value||"";
  if(!email||!password){err.textContent="Email dan password wajib diisi.";err.style.display="block";return}
  if(!window.supabase){err.textContent="Library Supabase gagal dimuat. Muat ulang halaman lalu coba lagi.";err.style.display="block";return}
  btn.disabled=true;btn.textContent="Memeriksa...";
  err.textContent="Menghubungkan ke Supabase...";
  err.style.display="block";
  try{
    var client=window.sb;
    if(!client){
      var controller=new AbortController();
      var timer=setTimeout(function(){controller.abort()},10000);
      var response;
      try{response=await fetch("/api/config?ts="+Date.now(),{cache:"no-store",signal:controller.signal})}finally{clearTimeout(timer)}
      if(!response.ok)throw new Error("Konfigurasi Supabase belum tersedia (HTTP "+response.status+").");
      var cfg=await response.json();
      if(!cfg.url||!cfg.key)throw new Error("Konfigurasi Supabase belum lengkap.");
      client=window.supabase.createClient(cfg.url,cfg.key);
      window.sb=client;
    }
    var loginPromise=client.auth.signInWithPassword({email:email,password:password});
    var timeoutPromise=new Promise(function(_,reject){
      setTimeout(function(){reject(new Error("Login ke Supabase terlalu lama. Periksa koneksi internet dan konfigurasi Supabase."));},15000);
    });
    var r=await Promise.race([loginPromise,timeoutPromise]);
    if(r.error)throw r.error;
    var session=r.data&&r.data.session;
    if(!session||!session.user)throw new Error("Sesi login tidak terbentuk. Silakan coba lagi.");
    var role=normalizeRole(session.user.app_metadata&&session.user.app_metadata.role);
    if(!role){
      await client.auth.signOut();
      throw new Error("Login berhasil, tetapi role akun belum diatur. Isi app_metadata.role dengan admin atau guru di Supabase.");
    }
    if(role!==loginRole){
      await client.auth.signOut();
      throw new Error("Akun ini adalah "+(role==="guru"?"Guru":"Admin")+". Pilih jenis akun yang sesuai.");
    }
    err.textContent="Login berhasil. Membuka panel...";
    lastStartedSessionId=session.user.id;
    if(typeof window.startApp!=="function"){throw new Error("Aplikasi utama belum siap. Muat ulang halaman setelah deployment selesai.");}\n    await window.startApp(session);
    err.style.display="none";
  }catch(e){
    console.error("LOGIN ERROR:",e);
    err.textContent="❌ "+(e&&e.message?e.message:"Login gagal. Periksa email dan password.");
    err.style.display="block";
  }finally{
    btn.disabled=false;
    btn.textContent=loginRole==="guru"?"Masuk sebagai Guru":"Masuk sebagai Admin";
  }
}
document.getElementById("adminModeBtnV5").onclick=function(){setLoginMode("admin")};
document.getElementById("guruModeBtnV5").onclick=function(){setLoginMode("guru")};
document.getElementById("loginPasswordToggleV5").onclick=function(){var p=document.getElementById("loginPasswordV5"),show=p.type==="password";p.type=show?"text":"password";this.textContent=show?"🙈":"👁";};
document.getElementById("loginBtnV5").onclick=jeniusLoginSubmitV5;
["loginEmailV5","loginPasswordV5"].forEach(function(id){document.getElementById(id).addEventListener("keydown",function(e){if(e.key==="Enter")jeniusLoginSubmitV5()})});
setLoginMode("admin");
