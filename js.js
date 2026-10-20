const STORAGE_KEY = "luca-finanzas-v1";
const USERS_KEY = "luca-family-accounts-v1";
const SESSION_KEY = "luca-family-session-v1";
let activeFamily = null;
const COLORS = ["#52dcb0", "#64b9ff", "#b29aff", "#ff9a85", "#e9c978", "#7ad8e8", "#f39ac7"];
const CATEGORY_ICONS = { "Vivienda":"⌂", "Alimentación":"✳", "Transporte":"↗", "Servicios":"ϟ", "Salud":"♡", "Educación":"▤", "Entretenimiento":"♫", "Salario":"↙", "Freelance":"✧", "Otros":"◈", "Ahorro":"◎" };
const money = n => new Intl.NumberFormat("es-CO", {style:"currency", currency:"COP", maximumFractionDigits:0}).format(Number(n)||0);
const shortMoney = n => { const v=Number(n)||0; if(v>=1e6)return "$"+(v/1e6).toLocaleString("es-CO",{maximumFractionDigits:2})+"M"; if(v>=1e3)return "$"+(v/1e3).toLocaleString("es-CO",{maximumFractionDigits:0})+"k"; return money(v); };
const todayISO = () => new Date().toISOString().slice(0,10);
const formatDate = s => { if(!s)return "Sin fecha"; const d=new Date(s+"T12:00:00"); return d.toLocaleDateString("es-CO",{day:"2-digit",month:"short"}).replace(".",""); };
const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const emptyFamilyData = () => ({movements:[],budgets:[],bills:[],goals:[]});
const initialData = () => ({
  movements:[
    {id:"m1",type:"ingreso",title:"Salario principal",category:"Salario",date:"2026-10-01",amount:4200000,description:"Ingreso mensual"},
    {id:"m2",type:"ingreso",title:"Trabajo independiente",category:"Freelance",date:"2026-10-05",amount:1500000,description:"Proyecto freelance"},
    {id:"m3",type:"ingreso",title:"Ingreso adicional",category:"Otros",date:"2026-10-10",amount:800000,description:"Ingreso ocasional"},
    {id:"m4",type:"gasto",title:"Mercado semanal",category:"Alimentación",date:"2026-10-03",amount:580000,description:"Compra para el hogar"},
    {id:"m5",type:"gasto",title:"Arriendo",category:"Vivienda",date:"2026-10-02",amount:1200000,description:"Vivienda familiar"},
    {id:"m6",type:"gasto",title:"Servicios públicos",category:"Servicios",date:"2026-10-08",amount:365000,description:"Agua, energía y gas"},
    {id:"m7",type:"gasto",title:"Transporte familiar",category:"Transporte",date:"2026-10-11",amount:245000,description:"Transporte del hogar"},
    {id:"m8",type:"gasto",title:"Cita médica",category:"Salud",date:"2026-10-13",amount:165000,description:"Consulta general"},
    {id:"m9",type:"gasto",title:"Material de estudio",category:"Educación",date:"2026-10-15",amount:280000,description:"Material académico"},
    {id:"m10",type:"gasto",title:"Actividad familiar",category:"Entretenimiento",date:"2026-10-16",amount:180000,description:"Salida del fin de semana"},
    {id:"m11",type:"gasto",title:"Compra de despensa",category:"Alimentación",date:"2026-10-17",amount:420000,description:"Reposición de alimentos"},
    {id:"m12",type:"gasto",title:"Movilidad",category:"Transporte",date:"2026-10-18",amount:220000,description:"Transporte semanal"},
  ],
  budgets:[
    {id:"b1",category:"Vivienda",amount:1300000},{id:"b2",category:"Alimentación",amount:1200000},
    {id:"b3",category:"Transporte",amount:550000},{id:"b4",category:"Servicios",amount:500000},
    {id:"b5",category:"Salud",amount:350000},{id:"b6",category:"Educación",amount:650000},
    {id:"b7",category:"Entretenimiento",amount:450000},{id:"b8",category:"Otros",amount:700000}
  ],
  bills:[
    {id:"f1",title:"Servicio de internet",amount:95000,due:"2026-10-20",status:"pendiente",category:"Servicios"},
    {id:"f2",title:"Energía eléctrica",amount:185000,due:"2026-10-22",status:"pendiente",category:"Servicios"},
    {id:"f3",title:"Plan de telefonía",amount:65000,due:"2026-10-24",status:"pendiente",category:"Servicios"},
    {id:"f4",title:"Administración",amount:280000,due:"2026-10-05",status:"pagada",category:"Vivienda"},
    {id:"f5",title:"Gas domiciliario",amount:120000,due:"2026-10-08",status:"pagada",category:"Servicios"}
  ],
  goals:[
    {id:"g1",title:"Fondo de emergencias",icon:"✧",saved:1360000,target:2000000,color:"#5bdcb4",deadline:"2026-12-31"},
    {id:"g2",title:"Paseo familiar",icon:"⌁",saved:640000,target:1500000,color:"#7cbcff",deadline:"2027-01-15"},
    {id:"g3",title:"Estudios y formación",icon:"▤",saved:850000,target:1200000,color:"#b39bff",deadline:"2026-12-15"}
  ]
});
let state = loadState();
let modalMode = "movement", editId = null, toastTimer;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
function loadState(){try{const key=activeFamily?`${STORAGE_KEY}:${activeFamily.id}`:STORAGE_KEY;const raw=localStorage.getItem(key);return raw?JSON.parse(raw):(activeFamily?emptyFamilyData():initialData())}catch{return activeFamily?emptyFamilyData():initialData()}}
function saveState(){try{const key=activeFamily?`${STORAGE_KEY}:${activeFamily.id}`:STORAGE_KEY;localStorage.setItem(key,JSON.stringify(state))}catch{showToast("No se pudo guardar en este navegador.")}}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function currentMonth(){return $("#monthFilter")?.value||"2026-10"}
function monthlyMovements(){return state.movements.filter(m=>(m.date||"").startsWith(currentMonth()))}
function totals(){const ms=monthlyMovements();const income=ms.filter(m=>m.type==="ingreso").reduce((a,m)=>a+Number(m.amount),0);const expenses=ms.filter(m=>m.type==="gasto").reduce((a,m)=>a+Number(m.amount),0);const budget=state.budgets.reduce((a,b)=>a+Number(b.amount),0);return {income,expenses,balance:income-expenses,budget,remaining:budget-expenses,ms}}
function setText(id,value){const el=$("#"+id);if(el)el.textContent=value}
function renderAll(){renderDashboard();renderBudget();renderMovements();renderBills();renderInsights();renderGoals();populateCategories();updateFamilyGreeting()}
function updateFamilyGreeting(){
 if(!activeFamily)return;
 const hour=new Date().getHours();const greeting=hour>=5&&hour<12?"Buenos días":hour>=12&&hour<19?"Buenas tardes":"Buenas noches";
 const familyName=activeFamily.lastNames;
 setText("welcomeHeading",`${greeting}, familia ${familyName} ✳`);
 setText("sidebarFamilyName",`Familia ${familyName}`);setText("profileFamilyName",`Familia ${familyName}`);
 const initials=familyName.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0].toUpperCase()).join("");
 const avatar=document.querySelector(".profile-avatar");if(avatar)avatar.textContent=initials||"LU";
 const demo=document.querySelector(".demo-pill");if(demo)demo.innerHTML="<i></i> Espacio familiar privado";
}
function renderDashboard(){
 const t=totals(),pending=state.bills.filter(b=>b.status==="pendiente").sort((a,b)=>a.due.localeCompare(b.due));
 setText("heroBalance",money(t.balance));setText("heroIncome",money(t.income));setText("heroExpenses",money(t.expenses));setText("metricIncome",money(t.income));setText("metricExpenses",money(t.expenses));
 setText("metricBudget",money(t.expenses));setText("budgetSub",`De ${money(t.budget)} planeados`);
 const used=t.budget>0?t.expenses/t.budget*100:0;setText("budgetTrend",`${Math.round(used)}% usado`);$("#budgetProgress").style.width=Math.min(100,Math.max(0,used))+"%";
 setText("metricBills",`${pending.length} factura${pending.length===1?"":"s"}`);setText("billSub",`${money(pending.reduce((a,b)=>a+b.amount,0))} por pagar`);setText("billNavCount",pending.length);
 const byCat={};t.ms.filter(m=>m.type==="gasto").forEach(m=>byCat[m.category]=(byCat[m.category]||0)+Number(m.amount));
 const sorted=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);let total=sorted.reduce((a,x)=>a+x[1],0);let deg=0;const segments=sorted.map(([cat,val],i)=>{const end=deg+(total?val/total*100:0);const out=`${COLORS[i%COLORS.length]} ${deg}% ${end}%`;deg=end;return out});
 $("#donutChart").style.background=segments.length?`conic-gradient(${segments.join(",")})`:"conic-gradient(#29414e 0 100%)";setText("donutTotal",shortMoney(total));
 $("#categoryLegend").innerHTML=sorted.length?sorted.slice(0,5).map(([cat,val],i)=>`<div class="legend-item"><span class="legend-dot" style="background:${COLORS[i%COLORS.length]}"></span><span class="legend-name">${esc(cat)}</span><span class="legend-value">${money(val)}</span></div>`).join(""):`<p class="subheading">Aún no hay gastos registrados.</p>`;
 $("#upcomingBills").innerHTML=pending.slice(0,3).map(b=>`<div class="upcoming-item"><span class="bill-icon">${CATEGORY_ICONS[b.category]||"▤"}</span><div class="bill-info"><strong>${esc(b.title)}</strong><small>Vence el ${formatDate(b.due)}</small></div><div class="bill-value"><strong>${money(b.amount)}</strong><span class="due-label ${daysUntil(b.due)<=3?"soon":""}">${daysUntil(b.due)<0?"Vencida":daysUntil(b.due)===0?"Vence hoy":`En ${daysUntil(b.due)} días`}</span></div></div>`).join("")||`<div class="empty-state">¡Todo al día! No hay facturas pendientes.</div>`;
 const recent=[...t.ms].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
 $("#recentMovements").innerHTML=recent.map(m=>`<tr><td><div class="movement-name"><span class="movement-icon" style="background:${m.type==="ingreso"?"#55e0b216":"#ff9a8517"};color:${m.type==="ingreso"?"#6be8bc":"#ffab9a"}">${CATEGORY_ICONS[m.category]||"◈"}</span><div><strong>${esc(m.title)}</strong><small>${m.type==="ingreso"?"Ingreso":"Gasto"}</small></div></div></td><td><span class="category-pill">${esc(m.category)}</span></td><td>${formatDate(m.date)}</td><td class="align-right ${m.type==="ingreso"?"amount-positive":"amount-negative"}">${m.type==="ingreso"?"+":"−"} ${money(m.amount)}</td></tr>`).join("")||`<tr><td colspan="4">Sin movimientos en este periodo.</td></tr>`;
 $("#teaserText").textContent=t.balance<0?"Los gastos superan los ingresos registrados. Revisen juntos las prioridades y acuerden un plan realista.":used>85?"El presupuesto está cerca de su límite. Una revisión tranquila puede ayudar a decidir qué pagos priorizar.":"Una revisión breve cada semana puede ayudar a que toda la familia tenga claras sus prioridades.";
}
function daysUntil(date){const a=new Date();a.setHours(0,0,0,0);const b=new Date((date||todayISO())+"T00:00:00");return Math.ceil((b-a)/86400000)}
function renderBudget(){
 const t=totals();setText("budgetTotalLarge",money(t.budget));setText("budgetSpentLarge",money(t.expenses));setText("budgetRemainingLarge",money(t.remaining));
 const spent={};t.ms.filter(m=>m.type==="gasto").forEach(m=>spent[m.category]=(spent[m.category]||0)+Number(m.amount));
 $("#budgetCategories").innerHTML=state.budgets.map((b,i)=>{const actual=spent[b.category]||0,pct=b.amount?actual/b.amount*100:0,over=pct>100;return `<div class="budget-category"><div class="budget-cat-name"><span class="category-symbol" style="background:${COLORS[i%COLORS.length]}18;color:${COLORS[i%COLORS.length]}">${CATEGORY_ICONS[b.category]||"◈"}</span><div><strong>${esc(b.category)}</strong><small>${over?"Límite superado":`${Math.max(0,Math.round(100-pct))}% disponible`}</small></div></div><div class="budget-bar-area"><div class="budget-bar-top"><span>${money(actual)} gastados</span><span>${Math.round(pct)}%</span></div><div class="budget-bar"><span style="width:${Math.min(100,pct)}%;background:${over?"#ff8f80":COLORS[i%COLORS.length]}"></span></div></div><div class="budget-amount"><strong>${money(b.amount)}</strong><small>presupuesto</small></div></div>`}).join("")||`<div class="empty-state">Agrega una categoría para comenzar tu presupuesto.</div>`;
}
function populateCategories(){
 const cats=[...new Set([...state.budgets.map(b=>b.category),...state.movements.map(m=>m.category),"Vivienda","Alimentación","Transporte","Servicios","Salud","Educación","Entretenimiento","Otros"])].sort();
 const select=$("#categoryFilter");if(select){const prev=select.value;select.innerHTML='<option value="all">Todas las categorías</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");select.value=cats.includes(prev)?prev:"all"}
}
function renderMovements(){
 const ms=[...monthlyMovements()].sort((a,b)=>b.date.localeCompare(a.date));const income=ms.filter(m=>m.type==="ingreso").reduce((a,m)=>a+m.amount,0),expenses=ms.filter(m=>m.type==="gasto").reduce((a,m)=>a+m.amount,0);
 setText("movementIncome",money(income));setText("movementExpenses",money(expenses));setText("movementCount",ms.length);
 const query=($("#movementSearch")?.value||"").toLowerCase(),type=$("#typeFilter")?.value||"all",cat=$("#categoryFilter")?.value||"all";
 const filtered=ms.filter(m=>(m.title+" "+(m.description||"")).toLowerCase().includes(query)&&(type==="all"||m.type===type)&&(cat==="all"||m.category===cat));
 $("#allMovements").innerHTML=filtered.map(m=>`<tr><td><div class="movement-name"><span class="movement-icon" style="background:${m.type==="ingreso"?"#55e0b216":"#ff9a8517"};color:${m.type==="ingreso"?"#6be8bc":"#ffab9a"}">${CATEGORY_ICONS[m.category]||"◈"}</span><div><strong>${esc(m.title)}</strong><small>${esc(m.description||"Sin descripción")}</small></div></div></td><td><span class="category-pill">${m.type==="ingreso"?"Ingreso":"Gasto"}</span></td><td>${esc(m.category)}</td><td>${formatDate(m.date)}</td><td class="align-right ${m.type==="ingreso"?"amount-positive":"amount-negative"}">${m.type==="ingreso"?"+":"−"} ${money(m.amount)}</td><td><div class="action-cell"><button class="tiny-action" data-edit-movement="${m.id}">Editar</button><button class="tiny-action delete" data-delete-movement="${m.id}">×</button></div></td></tr>`).join("");
 $("#movementEmpty").classList.toggle("hidden",filtered.length>0);if(!filtered.length)$("#allMovements").innerHTML="";
}
function renderBills(){
 const pending=state.bills.filter(b=>b.status==="pendiente"),paid=state.bills.filter(b=>b.status==="pagada");setText("pendingAmount",money(pending.reduce((a,b)=>a+b.amount,0)));setText("paidCount",`${paid.length} factura${paid.length===1?"":"s"}`);
 const next=[...pending].sort((a,b)=>a.due.localeCompare(b.due))[0];setText("nextDue",next?formatDate(next.due):"Todo al día");setText("nextDueName",next?next.title:"No hay pagos pendientes");
 const filter=$("#billFilter")?.value||"all",bills=[...state.bills].filter(b=>filter==="all"||b.status===filter).sort((a,b)=>a.due.localeCompare(b.due));
 $("#allBills").innerHTML=bills.map(b=>`<tr><td><div class="movement-name"><span class="movement-icon" style="background:#b29aff14;color:#c3afff">▤</span><div><strong>${esc(b.title)}</strong><small>${esc(b.category||"Otros")}</small></div></div></td><td>${formatDate(b.due)} ${b.status==="pendiente"&&daysUntil(b.due)<0?'<span class="due-label soon">· Vencida</span>':""}</td><td><span class="bill-status ${b.status==="pagada"?"status-paid":"status-pending"}">${b.status==="pagada"?"Pagada":"Pendiente"}</span></td><td class="align-right">${money(b.amount)}</td><td><button class="bill-action ${b.status==="pagada"?"undo":""}" data-toggle-bill="${b.id}">${b.status==="pagada"?"Desmarcar":"Marcar pagada"}</button> <button class="tiny-action delete" data-delete-bill="${b.id}">×</button></td></tr>`).join("");
 $("#billEmpty").classList.toggle("hidden",bills.length>0);if(!bills.length)$("#allBills").innerHTML="";
}
function buildInsights(){
 const t=totals(),spent={};t.ms.filter(m=>m.type==="gasto").forEach(m=>spent[m.category]=(spent[m.category]||0)+m.amount);
 const insights=[];
 if(t.balance<0)insights.push({icon:"↗",color:"#ff9a85",tag:"Balance mensual",title:"Revisen juntos las prioridades",body:`Los gastos superan los ingresos en ${money(Math.abs(t.balance))}. Comparen las necesidades esenciales con otros gastos y acuerden un plan realista.`,action:"Acción sugerida: elijan una prioridad para revisar en familia."});
 if(t.budget>0&&t.expenses/t.budget>.8)insights.push({icon:"◉",color:"#ffbd7d",tag:"Presupuesto",title:"El presupuesto está cerca del límite",body:`Han registrado ${Math.round(t.expenses/t.budget*100)}% del presupuesto planeado. Revisen lo que falta del mes antes de comprometer nuevos gastos.`,action:"Acción sugerida: revisen las categorías que aún tienen saldo."});
 state.budgets.filter(b=>(spent[b.category]||0)>b.amount).forEach(b=>insights.push({icon:CATEGORY_ICONS[b.category]||"◈",color:"#ff9a85",tag:"Categoría por revisar",title:`Gasto por encima de ${b.category.toLowerCase()}`,body:`El gasto registrado es ${money(spent[b.category])} frente a ${money(b.amount)} planeados. Esto no significa que sea innecesario; revisen qué cambió y qué ajustes son posibles.`,action:"Acción sugerida: acuerden un ajuste realista para el resto del mes."}));
 const upcoming=state.bills.filter(b=>b.status==="pendiente"&&daysUntil(b.due)>=0&&daysUntil(b.due)<=5);
 if(upcoming.length)insights.push({icon:"▤",color:"#b29aff",tag:"Pagos próximos",title:`Hay ${upcoming.length} factura${upcoming.length===1?"":"s"} próxima${upcoming.length===1?"":"s"} a vencer`,body:`${upcoming.map(b=>b.title).join(", ")}. Revisen si el dinero está reservado y acuerden quién se encargará del pago.`,action:"Acción sugerida: anoten la fecha y el responsable del pago."});
 const unbudgeted=[...new Set(t.ms.filter(m=>m.type==="gasto"&&!state.budgets.some(b=>b.category===m.category)).map(m=>m.category))];
 if(unbudgeted.length)insights.push({icon:"✧",color:"#7cbcff",tag:"Planificación",title:"Hay gastos sin categoría presupuestada",body:`Encontramos gastos en ${unbudgeted.join(", ")}. Estimar un límite puede ayudar a planear mejor, considerando primero las necesidades del hogar.`,action:"Acción sugerida: definan un límite orientativo para esa categoría."});
 if(t.balance>=0&&t.budget>0&&t.expenses/t.budget<=.8)insights.push({icon:"♡",color:"#55e0b2",tag:"Comunicación familiar",title:"Programen una revisión breve",body:"Una conversación semanal de diez minutos puede ayudar a compartir cambios, escuchar necesidades y evitar sorpresas al final del mes.",action:"Acción sugerida: elijan un día y una hora que funcionen para todos."});
 insights.push({icon:"◎",color:"#7cbcff",tag:"Metas compartidas",title:"Conviertan una idea en una meta concreta",body:"Definan juntos un objetivo, cuánto pueden aportar sin descuidar necesidades esenciales y una fecha para revisar el avance.",action:"Acción sugerida: consulten la sección Metas familiares."});
 return insights;
}
function renderInsights(){const list=buildInsights();$("#insightsList").innerHTML=list.map((x,i)=>`<article class="insight-card" style="animation-delay:${i*70}ms"><div class="insight-card-top"><span class="insight-card-icon" style="background:${x.color}18;color:${x.color}">${x.icon}</span><span class="insight-tag">${esc(x.tag)}</span></div><h3>${esc(x.title)}</h3><p>${esc(x.body)}</p><div class="insight-action">${esc(x.action)}</div></article>`).join("")}
function renderGoals(){$("#goalsGrid").innerHTML=state.goals.map(g=>{const pct=g.target?Math.min(100,g.saved/g.target*100):0;return `<article class="goal-card"><div class="goal-icon" style="background:${g.color}19;color:${g.color}">${esc(g.icon||"◎")}</div><h3>${esc(g.title)}</h3><p>Meta familiar compartida</p><div class="goal-numbers"><strong>${money(g.saved)}</strong><span>de ${money(g.target)}</span></div><div class="goal-progress"><span style="width:${pct}%;background:linear-gradient(90deg,${g.color},#a2f5d6)"></span></div><div class="goal-bottom"><span>${Math.round(pct)}% completado</span><strong>${money(Math.max(0,g.target-g.saved))} por ahorrar</strong></div><div class="goal-actions"><button class="tiny-action" data-add-saving="${g.id}">＋ Registrar ahorro</button><button class="tiny-action" data-edit-goal="${g.id}">Editar</button></div></article>`}).join("")||`<div class="empty-state">Todavía no hay metas. ¡Creen la primera!</div>`}
const viewTitles={dashboard:"Resumen",budget:"Presupuesto",movements:"Movimientos",bills:"Facturas",insights:"Recomendaciones",goals:"Metas familiares",help:"Ayuda y privacidad"};
function navigate(view){if(!viewTitles[view])return;$$(".view").forEach(v=>v.classList.toggle("active-view",v.id===`view-${view}`));$$(".nav-item[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));setText("breadcrumbTitle",viewTitles[view]);$("#sidebar").classList.remove("open");window.scrollTo({top:0,behavior:"smooth"})}
function showToast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2700)}
function openModal(mode,id=null){
 modalMode=mode;editId=id;const fields=$("#modalFields");let title="",body="";
 if(mode==="movement"){
  const item=id?state.movements.find(x=>x.id===id):null;title=item?"Editar movimiento":"Nuevo movimiento";
  body=`<div class="field"><label for="entryType">Tipo de movimiento</label><select id="entryType" name="type" required><option value="ingreso" ${item?.type==="ingreso"?"selected":""}>Ingreso</option><option value="gasto" ${!item||item.type==="gasto"?"selected":""}>Gasto</option></select></div>
  <div class="field"><label for="entryAmount">Valor (COP)</label><input id="entryAmount" name="amount" type="number" min="1" step="1" placeholder="Ej. 250000" value="${item?.amount??""}" required></div>
  <div class="field full"><label for="entryTitle">Concepto</label><input id="entryTitle" name="title" maxlength="70" placeholder="Ej. Mercado semanal" value="${esc(item?.title||"")}" required></div>
  <div class="field"><label for="entryCategory">Categoría</label><select id="entryCategory" name="category" required>${["Salario","Freelance","Vivienda","Alimentación","Transporte","Servicios","Salud","Educación","Entretenimiento","Otros"].map(c=>`<option ${item?.category===c?"selected":""}>${c}</option>`).join("")}</select></div>
  <div class="field"><label for="entryDate">Fecha</label><input id="entryDate" name="date" type="date" value="${item?.date||todayISO()}" required></div>
  <div class="field full"><label for="entryDescription">Descripción (opcional)</label><input id="entryDescription" name="description" maxlength="120" placeholder="Un detalle que quieran recordar" value="${esc(item?.description||"")}"></div>`;
 }else if(mode==="bill"){
  const item=id?state.bills.find(x=>x.id===id):null;title=item?"Editar factura":"Añadir factura";
  body=`<div class="field full"><label for="billTitle">Nombre de la factura</label><input id="billTitle" name="title" maxlength="70" placeholder="Ej. Servicio de internet" value="${esc(item?.title||"")}" required></div>
  <div class="field"><label for="billAmount">Valor (COP)</label><input id="billAmount" name="amount" type="number" min="1" step="1" value="${item?.amount??""}" placeholder="Ej. 95000" required></div>
  <div class="field"><label for="billDue">Fecha de vencimiento</label><input id="billDue" name="due" type="date" value="${item?.due||todayISO()}" required></div>
  <div class="field"><label for="billCategory">Categoría</label><select id="billCategory" name="category">${["Servicios","Vivienda","Alimentación","Transporte","Salud","Educación","Otros"].map(c=>`<option ${item?.category===c?"selected":""}>${c}</option>`).join("")}</select></div>
  <div class="field"><label for="billStatus">Estado</label><select id="billStatus" name="status"><option value="pendiente" ${item?.status!=="pagada"?"selected":""}>Pendiente</option><option value="pagada" ${item?.status==="pagada"?"selected":""}>Pagada</option></select></div>`;
 }else if(mode==="budget"){
  const item=id?state.budgets.find(x=>x.id===id):null;title=item?"Ajustar presupuesto":"Nueva categoría de presupuesto";
  body=`<div class="field full"><label for="budgetCategoryInput">Categoría</label><select id="budgetCategoryInput" name="category">${["Vivienda","Alimentación","Transporte","Servicios","Salud","Educación","Entretenimiento","Otros"].map(c=>`<option ${item?.category===c?"selected":""}>${c}</option>`).join("")}</select></div><div class="field full"><label for="budgetAmountInput">Límite mensual (COP)</label><input id="budgetAmountInput" name="amount" type="number" min="0" step="1000" value="${item?.amount??""}" placeholder="Ej. 500000" required></div>`;
 }else if(mode==="goal"){
  const item=id?state.goals.find(x=>x.id===id):null;title=item?"Editar meta":"Nueva meta familiar";
  body=`<div class="field full"><label for="goalTitle">Nombre de la meta</label><input id="goalTitle" name="title" maxlength="70" placeholder="Ej. Fondo de emergencias" value="${esc(item?.title||"")}" required></div><div class="field"><label for="goalTarget">Objetivo (COP)</label><input id="goalTarget" name="target" type="number" min="1" value="${item?.target??""}" required></div><div class="field"><label for="goalSaved">Ahorrado hasta ahora (COP)</label><input id="goalSaved" name="saved" type="number" min="0" value="${item?.saved??0}" required></div><div class="field full"><label for="goalDeadline">Fecha de revisión</label><input id="goalDeadline" name="deadline" type="date" value="${item?.deadline||"2026-12-31"}" required></div>`;
 }else if(mode==="saving"){
  const item=state.goals.find(x=>x.id===id);title="Registrar ahorro";
  body=`<div class="field full"><label>Meta seleccionada</label><input value="${esc(item?.title||"")}" disabled></div><div class="field full"><label for="savingAmount">¿Cuánto agregaron? (COP)</label><input id="savingAmount" name="savingAmount" type="number" min="1" placeholder="Ej. 50000" required></div>`;
 }
 $("#modalTitle").textContent=title;fields.innerHTML=body;$("#modalBackdrop").classList.remove("hidden");document.body.style.overflow="hidden";setTimeout(()=>fields.querySelector("input:not([disabled]),select")?.focus(),60);
}
function closeModal(){$("#modalBackdrop").classList.add("hidden");document.body.style.overflow="";editId=null}
function deleteConfirm(message){return window.confirm(message)}
$("#entryForm").addEventListener("submit",e=>{
 e.preventDefault();const fd=new FormData(e.currentTarget),v=Object.fromEntries(fd.entries());
 if(modalMode==="movement"){
  const item={id:editId||uid(),type:v.type,title:v.title.trim(),category:v.category,date:v.date,amount:Number(v.amount),description:v.description.trim()};
  if(!item.title||!Number.isFinite(item.amount)||item.amount<=0)return showToast("Revisa el concepto y el valor del movimiento.");
  if(editId)state.movements=state.movements.map(x=>x.id===editId?item:x);else state.movements.unshift(item);
  showToast(editId?"Movimiento actualizado.":"Movimiento registrado.");
 }else if(modalMode==="bill"){
  const item={id:editId||uid(),title:v.title.trim(),amount:Number(v.amount),due:v.due,status:v.status||"pendiente",category:v.category};
  if(!item.title||item.amount<=0)return showToast("Revisa el nombre y el valor de la factura.");
  if(editId)state.bills=state.bills.map(x=>x.id===editId?item:x);else state.bills.push(item);showToast(editId?"Factura actualizada.":"Factura añadida.");
 }else if(modalMode==="budget"){
  const existing=state.budgets.find(x=>x.category===v.category&&x.id!==editId);
  if(existing&&!editId)return showToast("Esa categoría ya tiene un presupuesto.");
  const item={id:editId||uid(),category:v.category,amount:Number(v.amount)};
  if(editId)state.budgets=state.budgets.map(x=>x.id===editId?item:x);else state.budgets.push(item);showToast("Presupuesto actualizado.");
 }else if(modalMode==="goal"){
  const item={id:editId||uid(),title:v.title.trim(),target:Number(v.target),saved:Number(v.saved),icon:"◎",color:COLORS[state.goals.length%COLORS.length],deadline:v.deadline};
  if(!item.title||item.target<=0||item.saved<0)return showToast("Revisa el nombre y los valores de la meta.");
  if(editId)state.goals=state.goals.map(x=>x.id===editId?{...x,...item,color:state.goals.find(g=>g.id===editId)?.color||item.color}:x);else state.goals.push(item);showToast(editId?"Meta actualizada.":"Meta creada.");
 }else if(modalMode==="saving"){
  const goal=state.goals.find(x=>x.id===editId),amount=Number(v.savingAmount);if(!goal||amount<=0)return showToast("Ingresa un valor válido.");goal.saved+=amount;showToast("¡Ahorro agregado a la meta!");
 }
 saveState();closeModal();renderAll();
});
function bindEvents(){
 $$("[data-view]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.view)));
 $$("[data-goto]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.goto)));
 $("#mobileMenu").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
 $("#quickAdd").addEventListener("click",()=>openModal("movement"));$("#addMovementButton").addEventListener("click",()=>openModal("movement"));
 $("#addBillButton").addEventListener("click",()=>openModal("bill"));$("#addBudgetButton").addEventListener("click",()=>openModal("budget"));$("#addGoalButton").addEventListener("click",()=>openModal("goal"));
 $("#modalClose").addEventListener("click",closeModal);$("#modalCancel").addEventListener("click",closeModal);
 $("#modalBackdrop").addEventListener("click",e=>{if(e.target===$("#modalBackdrop"))closeModal()});
 document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});
 $("#monthFilter").addEventListener("change",()=>{renderAll();const opt=$("#monthFilter").selectedOptions[0];$$(".soft-badge").forEach(b=>{if(b.closest("#view-budget"))b.textContent=opt.textContent})});
 $("#movementSearch").addEventListener("input",renderMovements);$("#typeFilter").addEventListener("change",renderMovements);$("#categoryFilter").addEventListener("change",renderMovements);$("#billFilter").addEventListener("change",renderBills);
 $("#notificationButton").addEventListener("click",()=>navigate("bills"));
 $("#allMovements").addEventListener("click",e=>{const edit=e.target.closest("[data-edit-movement]"),del=e.target.closest("[data-delete-movement]");if(edit)openModal("movement",edit.dataset.editMovement);if(del&&deleteConfirm("¿Quieres eliminar este movimiento? Esta acción no se puede deshacer.")){state.movements=state.movements.filter(m=>m.id!==del.dataset.deleteMovement);saveState();renderAll();showToast("Movimiento eliminado.")}});
 $("#allBills").addEventListener("click",e=>{const toggle=e.target.closest("[data-toggle-bill]"),del=e.target.closest("[data-delete-bill]");if(toggle){const b=state.bills.find(x=>x.id===toggle.dataset.toggleBill);if(b)b.status=b.status==="pagada"?"pendiente":"pagada";saveState();renderAll();showToast("Estado de la factura actualizado.")}if(del&&deleteConfirm("¿Quieres eliminar esta factura?")){state.bills=state.bills.filter(b=>b.id!==del.dataset.deleteBill);saveState();renderAll();showToast("Factura eliminada.")}});
 $("#budgetCategories").addEventListener("click",e=>{const row=e.target.closest(".budget-category");if(row){}});$("#budgetCategories").addEventListener("dblclick",e=>{const row=e.target.closest(".budget-category");if(row){const name=row.querySelector(".budget-cat-name strong")?.textContent;const b=state.budgets.find(x=>x.category===name);if(b)openModal("budget",b.id)}});
 $("#goalsGrid").addEventListener("click",e=>{const add=e.target.closest("[data-add-saving]"),edit=e.target.closest("[data-edit-goal]");if(add)openModal("saving",add.dataset.addSaving);if(edit)openModal("goal",edit.dataset.editGoal)});
 $("#newQuestion").addEventListener("click",()=>{const qs=["¿Qué gasto podríamos planear mejor el próximo mes?","¿Qué significa para cada uno sentirse tranquilo con el dinero?","¿Qué meta pequeña nos gustaría alcanzar juntos?","¿Cómo podemos repartir las responsabilidades de los pagos de forma justa?","¿Qué necesidad del hogar deberíamos priorizar este mes?"];const current=$("#newQuestion").dataset.q||"";const options=qs.filter(q=>q!==current);const q=options[Math.floor(Math.random()*options.length)];$("#newQuestion").dataset.q=q;$(".conversation-card h2").textContent=q});
 $("#exportData").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="luca-respaldo.json";a.click();URL.revokeObjectURL(url);showToast("Copia de datos preparada.")});
 $("#resetData").addEventListener("click",()=>{if(deleteConfirm("Esto reemplazará los datos de este navegador por la demostración inicial. ¿Continuar?")){state=initialData();saveState();renderAll();showToast("Demostración reiniciada.")}});
}
function readAccounts(){try{return JSON.parse(localStorage.getItem(USERS_KEY)||"[]")}catch{return []}}
function saveAccounts(accounts){localStorage.setItem(USERS_KEY,JSON.stringify(accounts))}
function normalizedUsername(value){return value.trim().toLowerCase().replace(/\s+/g,"")}
async function passwordDigest(password){
 if(window.crypto?.subtle){const bytes=new TextEncoder().encode(password);const hash=await crypto.subtle.digest("SHA-256",bytes);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,"0")).join("")}
 // Live Server funciona en localhost y permite Web Crypto; esta alternativa es solo para entornos locales antiguos.
 return btoa(unescape(encodeURIComponent(password)))
}
function showAuth(mode="login"){
 const login=mode==="login";$("#loginForm").classList.toggle("hidden",!login);$("#registerForm").classList.toggle("hidden",login);
 $("#showLogin").classList.toggle("active",login);$("#showRegister").classList.toggle("active",!login);
 setText("authTitle",login?"Qué bueno tenerlos aquí.":"Construyamos su espacio familiar.");
 setText("authSubtitle",login?"Inicien sesión para continuar cuidando las finanzas de su familia.":"Creen una cuenta para organizar sus finanzas en familia.");
 setText("loginError","");setText("registerError","");
}
function enterFamily(family){
 activeFamily={id:family.id,lastNames:family.lastNames,username:family.username};
 try{localStorage.setItem(SESSION_KEY,JSON.stringify({id:family.id}))}catch{}
 state=loadState();$("#authScreen").classList.add("auth-hidden");document.body.classList.remove("auth-locked");
 renderAll();showToast(`¡Bienvenida, familia ${family.lastNames}!`);
}
function logoutFamily(){
 saveState();activeFamily=null;try{localStorage.removeItem(SESSION_KEY)}catch{}
 closeModal();$("#authScreen").classList.remove("auth-hidden");document.body.classList.add("auth-locked");
 $("#loginPassword").value="";showAuth("login");
}
function bindAuth(){
 document.body.classList.add("auth-locked");showAuth("login");
 $("#showLogin").addEventListener("click",()=>showAuth("login"));$("#showRegister").addEventListener("click",()=>showAuth("register"));
 $("#loginForm").addEventListener("submit",async e=>{
  e.preventDefault();const username=normalizedUsername($("#loginUser").value);const password=$("#loginPassword").value;const error=$("#loginError");
  const family=readAccounts().find(a=>a.username===username);
  if(!family){error.textContent="No encontramos esa cuenta. Verifiquen el usuario o creen una familia.";return}
  const digest=await passwordDigest(password);if(digest!==family.passwordHash){error.textContent="La contraseña no coincide. Inténtenlo nuevamente.";return}
  enterFamily(family);
 });
 $("#registerForm").addEventListener("submit",async e=>{
  e.preventDefault();const lastNames=$("#familyLastNames").value.trim().replace(/\s+/g," ");const username=normalizedUsername($("#registerUser").value);const password=$("#registerPassword").value;const confirm=$("#registerPasswordConfirm").value;const error=$("#registerError");
  if(lastNames.length<2){error.textContent="Escriban los apellidos de la familia.";return}
  if(!/^[a-z0-9._-]{3,30}$/.test(username)){error.textContent="El usuario debe tener 3–30 caracteres: letras, números, punto, guion o guion bajo.";return}
  if(password.length<6){error.textContent="La contraseña debe tener al menos 6 caracteres.";return}
  if(password!==confirm){error.textContent="Las contraseñas no coinciden.";return}
  const accounts=readAccounts();if(accounts.some(a=>a.username===username)){error.textContent="Ese usuario ya existe. Elijan otro.";return}
  const salary=Number($("#setupSalary").value),otherIncome=Number($("#setupOtherIncome").value),budgetTotal=Number($("#setupBudget").value),savingsGoal=Number($("#setupSavings").value);
  if([salary,otherIncome,budgetTotal,savingsGoal].some(n=>!Number.isFinite(n)||n<0)){error.textContent="Revisen los valores financieros. No pueden ser negativos.";return}
  if(salary+otherIncome===0){error.textContent="Registren al menos un ingreso mensual para comenzar.";return}
  const family={id:uid(),lastNames,username,passwordHash:await passwordDigest(password),createdAt:new Date().toISOString(),monthlyIncome:{salary,otherIncome},budgetTotal,savingsGoal};
  try{accounts.push(family);saveAccounts(accounts);activeFamily=family;const now=todayISO();const movements=[];if(salary>0)movements.push({id:uid(),type:"ingreso",title:"Sueldo familiar",category:"Salario",date:now,amount:salary,description:"Sueldo mensual ingresado al crear la cuenta"});if(otherIncome>0)movements.push({id:uid(),type:"ingreso",title:"Otros ingresos familiares",category:"Otros",date:now,amount:otherIncome,description:"Otros ingresos mensuales declarados"});const budgets=budgetTotal>0?[{id:uid(),category:"Vivienda",amount:Math.round(budgetTotal*.35)},{id:uid(),category:"Alimentación",amount:Math.round(budgetTotal*.25)},{id:uid(),category:"Servicios",amount:Math.round(budgetTotal*.12)},{id:uid(),category:"Transporte",amount:Math.round(budgetTotal*.10)},{id:uid(),category:"Salud",amount:Math.round(budgetTotal*.08)},{id:uid(),category:"Otros",amount:Math.max(0,budgetTotal-Math.round(budgetTotal*.90))}]:[];state={movements,budgets,bills:[],goals:savingsGoal>0?[{id:uid(),title:"Meta de ahorro mensual",icon:"◎",saved:0,target:savingsGoal,color:"#5bdcb4",deadline:""}]:[]};saveState();enterFamily(family)}catch{error.textContent="No se pudo guardar la cuenta en este navegador."}
 });
 $("#logoutButton").addEventListener("click",logoutFamily);
 // No se inicia sesión automáticamente: la cuenta queda guardada, pero se solicita la contraseña al volver.
 try{localStorage.removeItem(SESSION_KEY)}catch{}
}
bindAuth();bindEvents();renderAll();
