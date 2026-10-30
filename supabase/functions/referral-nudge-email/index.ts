import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
const esc=(s:string)=>s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 try{
  const body=await req.json().catch(()=>({}));
  const {data:cfg,error:ce}=await admin.from("admin_push_config").select("webhook_secret").eq("id",true).single();
  if(ce||!cfg?.webhook_secret||req.headers.get("x-adverx-push-secret")!==cfg.webhook_secret)return json({error:"Unauthorized"},401);
  if(body.action!=="referral_nudge_email"||typeof body.user_id!=="string")return json({error:"Invalid payload"},400);
  const key=Deno.env.get("BREVO_API_KEY");if(!key)return json({error:"Email provider is not configured"},503);
  const [{data:u,error:ue},{data:p}]=await Promise.all([admin.auth.admin.getUserById(body.user_id),admin.from("profiles").select("full_name").eq("id",body.user_id).maybeSingle()]);
  const to=u.user?.email;if(ue||!to)return json({error:"Recipient email unavailable"},404);
  const name=String(p?.full_name||to.split("@")[0]),title=String(body.title||"AdverX earning update").slice(0,120),message=String(body.body||"").slice(0,1200);
  const html=`<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#172033"><main style="max-width:580px;margin:28px auto;background:#fff;border-radius:14px;overflow:hidden"><header style="background:#111827;padding:24px;text-align:center;color:#fff;font-size:26px;font-weight:800">AdverX</header><section style="padding:30px"><p style="color:#64748b">Hello ${esc(name)},</p><h1 style="font-size:22px">${esc(title)}</h1><p style="font-size:15px;line-height:1.7;color:#334155">${esc(message)}</p><a href="https://adverx.online/network" style="display:inline-block;margin-top:14px;background:#172033;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700">Open AdverX Network</a></section><footer style="padding:18px;text-align:center;background:#f8fafc;color:#64748b;font-size:12px">Automated account notification · adverx.online</footer></main></body></html>`;
  const sent=await fetch("https://api.brevo.com/v3/smtp/email",{method:"POST",headers:{accept:"application/json","api-key":key,"content-type":"application/json"},body:JSON.stringify({sender:{name:"AdverX",email:"support@adverx.online"},to:[{email:to}],subject:title+" — AdverX",htmlContent:html,textContent:"Hello "+name+"\n\n"+message+"\n\nhttps://adverx.online/network",headers:{"X-AdverX-Event":"referral_nudge"}})});
  if(!sent.ok){console.error("Brevo rejected referral nudge",sent.status,(await sent.text()).slice(0,300));return json({error:"Email provider rejected the message"},502);}
  return json({ok:true});
 }catch(e){console.error("referral-nudge-email error",e);return json({error:"Unable to send notification email"},500);}
});