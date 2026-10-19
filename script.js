var SOPS=[],HAC=[],db=null,admin=false,mode="loading",editing=null,hedit=null,canWrite=true,unlocked=false,fails=0,lockUntil=0,pending=null;
var PWH="03339d83b7c5b2d2b89e4f5917e09beb07a851512bf42a8ca5c7a8284acc4609";
var SECS=["Bar 22","Earth&Vine","Breakfast","Pastry"],sec=SECS[0];
var PR=[["1. Conduct a hazard analysis","Identify biological, chemical, physical and allergen hazards at every step of each recipe."],["2. Determine the critical control points","Find the steps where a control is essential, such as cooking, cooling and cold storage."],["3. Set critical limits","Define measurable limits for each point, for example a core temperature or a time."],["4. Set up monitoring","Decide who checks, how often and with which tool. Record every reading."],["5. Define corrective actions","Write down what to do when a limit is missed: fix, hold, re-cook or discard."],["6. Verify the system","Calibrate probes, review logs and audit the plan on a regular schedule."],["7. Keep records","Store temperature logs, training records and corrective action reports."]];
function el(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;")}
var list=document.getElementById("list"),q=document.getElementById("q"),cat=document.getElementById("cat");
function msg(t,err){var m=document.getElementById("status");m.textContent=t;m.className=err?"status err":"status";clearTimeout(msg.t);msg.t=setTimeout(function(){m.textContent=""},6000)}
function lines(t){return t.split("\n").map(function(x){return x.trim()}).filter(Boolean)}
function failed(){msg("Could not save the change. Your access may be view only. Ask an administrator.",true)}
function pills(){document.querySelectorAll(".pills").forEach(function(box){box.innerHTML="";SECS.forEach(function(x){var b=el("button","pill",esc(x));b.setAttribute("aria-pressed",x===sec);b.addEventListener("click",function(){sec=x;cat.value="";pills();render();hrender()});box.appendChild(b)})})}
function sha(t){return crypto.subtle.digest("SHA-256",new TextEncoder().encode(t)).then(function(b){return Array.prototype.map.call(new Uint8Array(b),function(x){return x.toString(16).padStart(2,"0")}).join("")})}
var pwd=document.getElementById("pwdlg"),pwf=document.getElementById("pwform"),pwerr=document.getElementById("pwerr");
function gate(){
if(admin||unlocked)return Promise.resolve();
if(!canWrite){msg("Your access is view only. Ask an administrator for editing access.",true);return Promise.reject()}
return new Promise(function(res,rej){pending={res:res,rej:rej};pwf.reset();pwerr.textContent="";pwd.showModal();pwf.elements.pw.focus()})}
pwf.addEventListener("submit",function(e){e.preventDefault();
if(Date.now()<lockUntil){pwerr.textContent="Too many attempts. Wait 30 seconds and try again.";return}
sha(pwf.elements.pw.value).then(function(h){
if(h===PWH){unlocked=true;fails=0;var p=pending;pending=null;pwd.close();if(p)p.res();msg("Unlocked. You can now make changes until you close this page.")}
else{fails++;if(fails>=5){lockUntil=Date.now()+30000;fails=0;pwerr.textContent="Too many attempts. Wait 30 seconds and try again."}else pwerr.textContent="Incorrect password. Try again.";pwf.reset();pwf.elements.pw.focus()}
}).catch(function(){pwerr.textContent="Could not check the password in this browser."})});
document.getElementById("pwcancel").addEventListener("click",function(){pwd.close()});
pwd.addEventListener("close",function(){if(pending){var p=pending;pending=null;p.rej()}});
function notReady(){return mode==="loading"?"Loading…":"Sign in to Claude with an account that has access to this page to see the S.O.P. recipes and HACCP guidance."}
function delBtn(label,fn){var b=el("button","btn sm del",label);b.type="button";b.addEventListener("click",function(){if(!b.classList.contains("sure")){gate().then(function(){b.classList.add("sure");b.textContent="Confirm delete";setTimeout(function(){b.classList.remove("sure");b.textContent=label},4000)}).catch(function(){});return}fn()});return b}
function render(){
list.innerHTML="";
if(mode!=="ready"){cat.innerHTML='<option value="">All categories</option>';list.appendChild(el("div","empty",notReady()));return}
var cur=cat.value;cat.innerHTML='<option value="">All categories</option>';
var inSec=SOPS.filter(function(s){return s.sec===sec});
inSec.map(function(s){return s.c}).filter(function(v,i,a){return a.indexOf(v)===i}).forEach(function(c){var o=el("option",null,esc(c));o.value=c;cat.appendChild(o)});
cat.value=cur;var c=cat.value,term=q.value.trim().toLowerCase(),n=0;
inSec.forEach(function(s){
if(c&&s.c!==c)return;
if(term&&(s.n+" "+s.i.join(" ")).toLowerCase().indexOf(term)<0)return;
n++;
var d=el("details","sop");
d.innerHTML='<summary><h3>'+esc(s.n)+'</h3><span class="meta"><span class="tag">'+esc(s.c)+'</span>Yield: '+esc(s.y)+' · '+esc(s.t)+'</span></summary>'+
'<div class="body"><div><h4>Ingredients</h4><ul>'+s.i.map(function(x){return"<li>"+esc(x)+"</li>"}).join("")+'</ul><p class="meta" style="margin-top:10px"><strong>Allergens:</strong> '+esc(s.a)+'</p></div>'+
'<div><h4>Method</h4><ol>'+s.s.map(function(x){return"<li>"+esc(x)+"</li>"}).join("")+'</ol></div><div class="ccp">'+esc(s.k)+'</div></div>';
if(mode==="ready"){var r=el("div","adminrow");var eb=el("button","btn sm out","Edit S.O.P.");eb.type="button";eb.addEventListener("click",function(){gate().then(function(){openSop(s)}).catch(function(){})});r.appendChild(eb);r.appendChild(delBtn("Delete S.O.P.",function(){db.doc("sops/"+s.id).delete().then(function(){msg("S.O.P. deleted.")}).catch(failed)}));d.querySelector(".body").appendChild(r)}
list.appendChild(d)});
if(!n)list.appendChild(el("div","empty",SOPS.some(function(s){return s.sec===sec})?"No "+esc(sec)+" recipes match your search. Clear the filters to see all "+esc(sec)+" S.O.P. recipes.":"No "+esc(sec)+" S.O.P. recipes yet."+" Use Add S.O.P. to create the first one."))}
function hf(h){return h.food||h.p||""}
function ha(h){return h.act||(h.l?h.l+". "+(h.a||""):(h.a||""))}
function hrender(){document.getElementById("hsec").textContent=sec+": food and action";
document.getElementById("hhead").innerHTML="<tr><th>Food</th><th>Action</th>"+"<th>Actions</th>"+"</tr>";
var body=document.getElementById("hrows");body.innerHTML="";
if(mode!=="ready"){body.innerHTML='<tr><td colspan="3">'+esc(notReady())+'</td></tr>';return}
var rows=HAC.filter(function(h){return h.sec===sec});
if(!rows.length)body.innerHTML='<tr><td colspan="3">No HACCP entries for '+esc(sec)+' yet.'+" Add one below."+'</td></tr>';
rows.forEach(function(h){var tr;
if(hedit===h.id){tr=el("tr","hrow");tr.innerHTML='<td><input aria-label="Food" maxlength="120"></td><td><input aria-label="Action" maxlength="300"></td>';
var ins=tr.querySelectorAll("input");ins[0].value=hf(h);ins[1].value=ha(h);
var td=el("td"),w=el("div","cellacts"),sv=el("button","btn sm","Save"),cn=el("button","btn sm out","Cancel");sv.type=cn.type="button";
sv.addEventListener("click",function(){var fd=ins[0].value.trim(),ac=ins[1].value.trim();if(!fd||!ac){msg("Fill in both Food and Action before saving.",true);return}
db.doc("haccp/"+h.id).set({sec:h.sec,food:fd,act:ac,ts:h.ts||Date.now()}).then(function(){hedit=null;hrender();msg("HACCP entry updated.")}).catch(failed)});
cn.addEventListener("click",function(){hedit=null;hrender()});
w.appendChild(sv);w.appendChild(cn);td.appendChild(w);tr.appendChild(td)}
else{tr=el("tr",null,"<td>"+esc(hf(h))+"</td><td>"+esc(ha(h))+"</td>");
if(true){var td2=el("td"),w2=el("div","cellacts"),eb=el("button","btn sm out","Edit");eb.type="button";eb.addEventListener("click",function(){gate().then(function(){hedit=h.id;hrender()}).catch(function(){})});
w2.appendChild(eb);w2.appendChild(delBtn("Delete",function(){db.doc("haccp/"+h.id).delete().then(function(){msg("HACCP entry deleted.")}).catch(failed)}));td2.appendChild(w2);tr.appendChild(td2)}}
body.appendChild(tr)})}
function applyRole(){document.getElementById("role").textContent=admin?"Administrator":(canWrite?"Staff":"View only");
document.getElementById("sopadmin").hidden=mode!=="ready";document.getElementById("hform").hidden=mode!=="ready"}
q.addEventListener("input",render);cat.addEventListener("change",render);
var dlg=document.getElementById("sopdlg");
var sf=document.getElementById("sopform");
function openSop(r){editing=r?r.id:null;sf.reset();
document.getElementById("dlgt").textContent=r?"Edit S.O.P.":"Add S.O.P.";document.getElementById("savesop").textContent=r?"Save changes":"Save S.O.P.";
if(r){var e=sf.elements;e.n.value=r.n;e.c.value=r.c;e.y.value=r.y;e.t.value=r.t;e.a.value=r.a;e.i.value=r.i.join("\n");e.s.value=r.s.join("\n");e.k.value=r.k}
dlg.showModal()}
dlg.addEventListener("close",function(){editing=null});
document.getElementById("addsop").addEventListener("click",function(){gate().then(function(){openSop(null)}).catch(function(){})});
document.getElementById("cancel").addEventListener("click",function(){dlg.close()});
document.getElementById("sopform").addEventListener("submit",function(e){e.preventDefault();if(!db)return;var f=e.target,v=function(n){return f.elements[n].value.trim()};
var rec={sec:sec,n:v("n"),c:v("c")||"General",y:v("y")||"-",t:v("t")||"-",a:v("a")||"None",i:lines(f.elements.i.value),s:lines(f.elements.s.value),k:v("k")||"No critical control point noted.",ts:Date.now()};
if(!rec.i.length||!rec.s.length){msg("Add at least one ingredient and one method step.",true);return}
var cur=editing?SOPS.filter(function(x){return x.id===editing})[0]:null;if(cur){rec.sec=cur.sec;rec.ts=cur.ts}
var pr=cur?db.doc("sops/"+cur.id).set(rec):db.collection("sops").add(rec);
pr.then(function(){dlg.close();f.reset();msg(cur?"S.O.P. updated.":"S.O.P. added to "+sec+".")}).catch(failed)});
document.getElementById("hform").addEventListener("submit",function(e){e.preventDefault();if(!db)return;var f=e.target;
gate().then(function(){return db.collection("haccp").add({sec:sec,food:f.elements.food.value.trim(),act:f.elements.act.value.trim(),ts:Date.now()}).then(function(){f.reset();msg("HACCP entry added to "+sec+".")}).catch(failed)}).catch(function(){})});
pills();render();hrender();applyRole();
(async function(){
var user=null;try{user=await claude.use("user")}catch(e){}
try{admin=user?await user.canEdit():false}catch(e){admin=false}
try{var w=user?await user.can("data.write"):null;canWrite=w!==false}catch(e){canWrite=true}
try{db=await claude.use("db")}catch(e){db=null}
if(!db){mode="offline";admin=false;canWrite=false;render();hrender();applyRole();return}
var got={};
function ready(k){got[k]=1;if(got.sops&&got.haccp){mode="ready";render();hrender();applyRole()}}
function off(){mode="offline";admin=false;render();hrender();applyRole()}
function load(snap){return snap.docs.map(function(d){var x=Object.assign({},d.data());x.id=d.id;return x})}
db.collection("sops").onSnapshot(function(snap){SOPS=load(snap).sort(function(a,b){return a.n.localeCompare(b.n)});if(mode==="ready"){render()}else ready("sops")},off);
db.collection("haccp").onSnapshot(function(snap){HAC=load(snap).sort(function(a,b){return (a.ts||0)-(b.ts||0)});if(mode==="ready"){hrender()}else ready("haccp")},off);
})();
var pr=document.getElementById("princ");
PR.forEach(function(p){var d=el("details","sop");d.innerHTML='<summary><h3>'+esc(p[0])+'</h3></summary><div style="padding:0 18px 16px">'+esc(p[1])+'</div>';pr.appendChild(d)});
var tabs=document.querySelectorAll("nav button");
function show(id){tabs.forEach(function(b){var on=b.id===id;b.setAttribute("aria-selected",on);document.getElementById(b.getAttribute("aria-controls")).hidden=!on})}
tabs.forEach(function(b){b.addEventListener("click",function(){show(b.id)})});
var f=document.getElementById("pdf"),v=document.getElementById("viewer"),m=document.getElementById("pdfmsg");
document.querySelector('label[for=pdf]').addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();f.click()}});
f.addEventListener("change",function(){var file=f.files[0];if(!file)return;
if(file.type!=="application/pdf"){m.textContent="That file is not a PDF. Choose a .pdf file and try again.";return}
v.src=URL.createObjectURL(file);v.hidden=false;m.textContent="Showing: "+file.name});
