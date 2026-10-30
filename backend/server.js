const http = require('node:http');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const PORT = Number(process.env.PORT || 3001);
const TOKEN = process.env.ADMIN_TOKEN || '';
const DOH = process.env.DOH_URL || '';
const DB = path.join(__dirname, 'data', 'profiles.json');
fs.mkdirSync(path.dirname(DB), { recursive: true });
function read() { try { return JSON.parse(fs.readFileSync(DB, 'utf8')); } catch { return []; } }
function write(rows) { const tmp=DB+'.tmp'; fs.writeFileSync(tmp, JSON.stringify(rows,null,2), {mode:0o600}); fs.renameSync(tmp,DB); }
function respond(res, status, data, type='application/json; charset=utf-8') {
 res.writeHead(status, {'Content-Type':type, 'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 res.end(typeof data==='string'?data:JSON.stringify(data));
}
function authorized(req) { return TOKEN.length>=24 && crypto.timingSafeEqual(Buffer.from((req.headers.authorization||'').slice(7).padEnd(TOKEN.length,' ').slice(0,TOKEN.length)),Buffer.from(TOKEN)) && req.headers.authorization === 'Bearer '+TOKEN; }
function xml(s) {return String(s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));}
function profile(name, url) {
 const id=crypto.randomUUID().toUpperCase(), inner=crypto.randomUUID().toUpperCase();
 return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>
 <key>PayloadType</key><string>Configuration</string><key>PayloadVersion</key><integer>1</integer>
 <key>PayloadIdentifier</key><string>com.vinhdat.dns.${id.toLowerCase()}</string><key>PayloadUUID</key><string>${id}</string>
 <key>PayloadDisplayName</key><string>VINHDAT DNS - ${xml(name)}</string>
 <key>PayloadDescription</key><string>Encrypted DNS configuration; does not unlock subscriptions.</string>
 <key>PayloadContent</key><array><dict>
 <key>PayloadType</key><string>com.apple.dnsSettings.managed</string><key>PayloadVersion</key><integer>1</integer>
 <key>PayloadIdentifier</key><string>com.vinhdat.dns.settings.${inner.toLowerCase()}</string>
 <key>PayloadUUID</key><string>${inner}</string><key>PayloadDisplayName</key><string>VINHDAT DoH</string>
 <key>DNSSettings</key><dict><key>DNSProtocol</key><string>HTTPS</string><key>ServerURL</key><string>${xml(url)}</string></dict>
 </dict></array></dict></plist>`;
}
http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/health' && req.method==='GET') return respond(res,200,{ok:true,service:'vinhdat-api',dohConfigured:validDoh()});
 if(u.pathname==='/api/profiles' && req.method==='GET') {
  if(!authorized(req)) return respond(res,401,{error:'Unauthorized'});
  return respond(res,200,read());
 }
 if(u.pathname==='/api/profiles' && req.method==='POST') {
  if(!authorized(req)) return respond(res,401,{error:'Unauthorized'});
  let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>4096)return respond(res,413,{error:'Too large'});}
  let body;try{body=JSON.parse(raw)}catch{return respond(res,400,{error:'Invalid JSON'})}
  const name=String(body.name||'').trim();if(!/^[\p{L}\p{N} _.-]{1,50}$/u.test(name))return respond(res,400,{error:'Invalid name'});
  const rows=read(), item={id:crypto.randomUUID(),name,createdAt:new Date().toISOString(),enabled:true};rows.push(item);write(rows);
  return respond(res,201,item);
 }
 if(u.pathname==='/api/profile.mobileconfig' && req.method==='GET') {
  if(!authorized(req))return respond(res,401,{error:'Unauthorized'});
  if(!validDoh())return respond(res,503,{error:'Set DOH_URL to a real HTTPS endpoint first'});
  const item=read().find(x=>x.id===u.searchParams.get('id')&&x.enabled);
  if(!item)return respond(res,404,{error:'Profile not found'});
  res.setHeader('Content-Disposition','attachment; filename="VINHDAT.mobileconfig"');
  return respond(res,200,profile(item.name,DOH),'application/x-apple-aspen-config');
 }
 respond(res,404,{error:'Not found'});
}).listen(PORT,'0.0.0.0',()=>console.log(`VINHDAT API on ${PORT}`));
function validDoh(){try{const u=new URL(DOH);return u.protocol==='https:' && u.hostname!=='dns.example.com' && u.pathname.length>1}catch{return false}}
