/* Email credentials and recipient addresses stay on the server. */
module.exports=async(req,res)=>{
res.setHeader('Cache-Control','no-store');
if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service=process.env.SUPABASE_SERVICE_ROLE_KEY;
const token=(req.headers.authorization||'').match(/^Bearer (.+)$/)?.[1];
if(!token)return res.status(401).json({error:'Silakan login.'});
if(!url||!key||!service)return res.status(503).json({error:'Konfigurasi email belum aktif.'});
try{
const auth=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+token},signal:AbortSignal.timeout(10000)});
if(!auth.ok)return res.status(401).json({error:'Sesi tidak valid.'});
const user=await auth.json();if(user.app_metadata?.role!=='admin')return res.status(403).json({error:'Hanya Admin.'});
const id=req.body?.announcement_id;
if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return res.status(400).json({error:'Pengumuman tidak valid.'});
if(!process.env.RESEND_API_KEY||!process.env.ANNOUNCEMENT_EMAIL_FROM||!process.env.PARENT_PORTAL_URL)return res.status(503).json({error:'Layanan email belum dikonfigurasi.'});
const portal=new URL(process.env.PARENT_PORTAL_URL);if(portal.protocol!=='https:')throw Error('Invalid portal configuration');
const headers={apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'};
const result=await fetch(url+'/rest/v1/rpc/jenius_announcement_email_targets',{method:'POST',headers,body:JSON.stringify({target_announcement:id}),signal:AbortSignal.timeout(10000)});
if(!result.ok)throw Error('Database unavailable');
const data=await result.json();if(!data)return res.status(404).json({error:'Pengumuman tidak ditemukan.'});
let sent=0,failed=0;const recipients=data.recipients.slice(0,20);
for(const recipient of recipients){
const delivery=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'announcement-'+id+'-'+recipient.user_id},body:JSON.stringify({from:process.env.ANNOUNCEMENT_EMAIL_FROM,to:[recipient.email],subject:'Jenius Edu: '+data.title,text:data.body+'\n\nLihat pengumuman dan poster di Portal Orang Tua:\n'+portal.href+'\n\nAnda menerima email karena mengaktifkan pemberitahuan. Pengaturan dapat diubah di portal.'}),signal:AbortSignal.timeout(10000)});
if(!delivery.ok){failed++;continue;}
const saved=await fetch(url+'/rest/v1/parent_announcement_deliveries?on_conflict=announcement_id,user_id',{method:'POST',headers:{...headers,Prefer:'resolution=merge-duplicates'},body:JSON.stringify({announcement_id:id,user_id:recipient.user_id,sent_at:new Date().toISOString()}),signal:AbortSignal.timeout(10000)});
if(saved.ok)sent++;else failed++;
}
return res.status(200).json({sent,failed,remaining:Math.max(0,data.recipients.length-recipients.length)});
}catch(e){return res.status(502).json({error:'Pengiriman belum selesai. Coba lagi melalui tombol Kirim Email.'});}
};
