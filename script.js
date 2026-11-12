const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const COLORS = {strength:"var(--strength)",cardio:"var(--cardio)",stretch:"var(--stretch)",nutrition:"var(--nutrition)",water:"var(--water)"};
const LABELS = {strength:"Strength",cardio:"Cardio",stretch:"Stretch / Yoga",nutrition:"Nutrition",water:"Water"};
const $ = id => document.getElementById(id);

const todayIdx = (new Date().getDay() + 6) % 7; // Mon = 0
let tasks = load();
let selDay = todayIdx, filter = "all", editId = null;

function load(){
  try { return JSON.parse(localStorage.getItem("fittasks")) || []; } catch { return []; }
}
function save(){
  try { localStorage.setItem("fittasks", JSON.stringify(tasks)); } catch {}
}

// Setup
$("dateLine").textContent = new Date().toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"});
$("day").innerHTML = DAYS.map((d,i)=>`<option value="${i}">${d}</option>`).join("");
$("day").value = selDay;

function renderDays(){
  $("days").innerHTML = DAYS.map((d,i)=>
    `<button data-d="${i}" class="${i===selDay?"active":""} ${i===todayIdx?"today":""}">${d}</button>`).join("");
}

function render(){
  renderDays();
  const dayTasks = tasks.filter(t=>t.day===selDay);
  const done = dayTasks.filter(t=>t.done).length;
  const shown = dayTasks.filter(t=>filter==="all"||(filter==="done")===t.done);

  $("list").innerHTML = shown.map(t=>`
    <li class="item ${t.done?"done":""}" style="--c:${COLORS[t.category]}" data-id="${t.id}">
      <input type="checkbox" ${t.done?"checked":""} aria-label="Mark ${esc(t.name)} done">
      <div class="info">
        <div class="title">${esc(t.name)}</div>
        <div class="meta">${LABELS[t.category]}${t.target?" · "+esc(t.target):""}</div>
      </div>
      <div class="acts">
        <button class="icon edit" aria-label="Edit"><svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg></button>
        <button class="icon del" aria-label="Delete"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></button>
      </div>
    </li>`).join("");
  $("empty").hidden = shown.length > 0;

  const pct = dayTasks.length ? Math.round(done/dayTasks.length*100) : 0;
  $("ringText").textContent = pct + "%";
  $("ringFg").style.strokeDashoffset = 113.1 * (1 - pct/100);
  $("sTotal").textContent = dayTasks.length;
  $("sDone").textContent = done;
  $("sWeek").textContent = tasks.filter(t=>t.done).length;
}

function esc(s){ return s.replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

function resetForm(){
  editId = null;
  $("taskForm").reset();
  $("day").value = selDay;
  $("formTitle").textContent = "Add a task";
  $("saveBtn").textContent = "Add task";
  $("cancelBtn").hidden = true;
}

$("taskForm").addEventListener("submit", e=>{
  e.preventDefault();
  const data = {
    name: $("name").value.trim(),
    category: $("category").value,
    target: $("target").value.trim(),
    day: +$("day").value
  };
  if(!data.name) return;
  if(editId){
    const t = tasks.find(t=>t.id===editId);
    Object.assign(t, data);
  } else {
    tasks.push({id: Date.now().toString(36)+Math.random().toString(36).slice(2,6), done:false, ...data});
  }
  selDay = data.day;
  save(); resetForm(); closeSheet(); render();
});

$("cancelBtn").addEventListener("click", ()=>{ resetForm(); closeSheet(); });

// Mobile bottom sheet
function openSheet(){ document.body.classList.add("sheet-open"); }
function closeSheet(){ document.body.classList.remove("sheet-open"); }
$("fab").addEventListener("click", ()=>{ resetForm(); openSheet(); $("name").focus(); });
$("backdrop").addEventListener("click", ()=>{ resetForm(); closeSheet(); });
$("closeSheet").addEventListener("click", ()=>{ resetForm(); closeSheet(); });
document.addEventListener("keydown", e=>{ if(e.key==="Escape"){ resetForm(); closeSheet(); } });

$("list").addEventListener("click", e=>{
  const li = e.target.closest(".item"); if(!li) return;
  const t = tasks.find(t=>t.id===li.dataset.id);
  if(e.target.matches("input[type=checkbox]")){
    t.done = e.target.checked; save(); render();
  } else if(e.target.classList.contains("del")){
    tasks = tasks.filter(x=>x!==t); save(); render();
  } else if(e.target.classList.contains("edit")){
    editId = t.id;
    $("name").value = t.name; $("category").value = t.category;
    $("target").value = t.target; $("day").value = t.day;
    $("formTitle").textContent = "Edit task";
    $("saveBtn").textContent = "Save changes";
    $("cancelBtn").hidden = false;
    openSheet();
    $("name").focus();
    if(innerWidth>760) window.scrollTo({top:0,behavior:"smooth"});
  }
});

$("days").addEventListener("click", e=>{
  const b = e.target.closest("button"); if(!b) return;
  selDay = +b.dataset.d;
  if(!editId) $("day").value = selDay;
  render();
});

$("filters").addEventListener("click", e=>{
  const b = e.target.closest("button"); if(!b) return;
  if(b.id==="clearDone"){
    tasks = tasks.filter(t=>!(t.day===selDay && t.done)); save(); render(); return;
  }
  filter = b.dataset.f;
  document.querySelectorAll(".chip[data-f]").forEach(c=>c.classList.toggle("active", c===b));
  render();
});

render();