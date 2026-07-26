const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbw-dOfsvJW8CS1K86saUNkJN46Qp65Llr-7oJA6g7xwc3Xuu38VzkSqrQ1suB7QCl3u0g/exec",
  SCHOOL_NAME: "โรงเรียนเทพศิรินทร์ นนทบุรี",
  SCHOOL_COORDS: [13.8139368, 100.4139846]
};

const state = {
  view: "home", history: [], authRole: "student", user: null, profile: null,
  students: [], groups: [], map: null, marker: null, lat: null, lng: null,
  academicYear: "2569"
};

const $ = (id) => document.getElementById(id);
const views = [...document.querySelectorAll(".view")];

function showView(name, push = true) {
  if (push && state.view !== name) state.history.push(state.view);
  state.view = name;
  views.forEach(v => v.classList.toggle("active", v.id === `view-${name}`));
  $("backBtn").classList.toggle("hidden", name === "home" || ["student","teacher","admin"].includes(name));
  window.scrollTo({top:0, behavior:"smooth"});
  if (name === "location") setTimeout(initMap, 150);
}

function toast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(window.__toast); window.__toast = setTimeout(()=>el.classList.remove("show"), 3000);
}

let loadingRequestCount = 0;

const LOADING_MESSAGES = {
  login: ["กำลังเข้าสู่ระบบ", "กำลังตรวจสอบข้อมูลบัญชี"],
  register: ["กำลังสมัครสมาชิก", "กำลังบันทึกข้อมูลลงในระบบ"],
  forgotPassword: ["กำลังส่งคำขอ", "กรุณารอสักครู่"],
  saveProfile: ["กำลังบันทึกข้อมูล", "กำลังเชื่อมข้อมูลกับห้องเรียน"],
  getLocation: ["กำลังโหลดข้อมูลบ้าน", "กรุณารอสักครู่"],
  saveLocation: ["กำลังบันทึกข้อมูลบ้าน", "กำลังจัดเก็บพิกัดและรายละเอียด"],
  getTeacherDashboard: ["กำลังโหลดข้อมูลนักเรียน", "กำลังตรวจสอบข้อมูลในห้องเรียน"],
  calculateGroups: ["กำลังคำนวณเส้นทาง", "กำลังจัดกลุ่มบ้านที่อยู่ในทิศทางเดียวกัน"],
  saveGroups: ["กำลังบันทึกแผนเยี่ยมบ้าน", "กรุณารอสักครู่"],
  getAdminDashboard: ["กำลังโหลดข้อมูลระบบ", "กรุณารอสักครู่"],
  setAcademicYear: ["กำลังเปลี่ยนปีการศึกษา", "กรุณารอสักครู่"],
  toggleAccount: ["กำลังอัปเดตบัญชี", "กรุณารอสักครู่"],
  updateAccount: ["กำลังบันทึกข้อมูลสมาชิก", "กรุณารอสักครู่"],
  deleteAccount: ["กำลังลบบัญชี", "กรุณารอสักครู่"],
  setTemporaryPassword: ["กำลังตั้งรหัสผ่านชั่วคราว", "กรุณารอสักครู่"],
  changeOwnPassword: ["กำลังบันทึกรหัสผ่านใหม่", "กรุณารอสักครู่"],
  getCloseYearPreview: ["กำลังตรวจสอบข้อมูลปีการศึกษา", "กรุณารอสักครู่"],
  closeAcademicYear: ["กำลังปิดปีการศึกษา", "ระบบกำลังสำรองข้อมูลและเลื่อนชั้น"],
  getArchiveData: ["กำลังโหลดข้อมูลย้อนหลัง", "กรุณารอสักครู่"]
};

function showLoading(action = "", title = "", message = "") {
  const overlay = $("loadingOverlay");
  if (!overlay) return;

  loadingRequestCount += 1;
  const fallback = LOADING_MESSAGES[action] || ["กำลังโหลดข้อมูล", "กรุณารอสักครู่"];

  $("loadingTitle").textContent = title || fallback[0];
  $("loadingMessage").textContent = message || fallback[1];

  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-busy", "true");
  document.body.classList.add("is-loading");
}

function hideLoading(force = false) {
  const overlay = $("loadingOverlay");
  if (!overlay) return;

  loadingRequestCount = force ? 0 : Math.max(0, loadingRequestCount - 1);
  if (loadingRequestCount > 0) return;

  overlay.classList.add("hidden");
  overlay.setAttribute("aria-busy", "false");
  document.body.classList.remove("is-loading");
}

async function api(action, payload = {}) {
  if (!CONFIG.API_URL || CONFIG.API_URL.includes("PASTE_YOUR")) {
    throw new Error("ยังไม่ได้เชื่อม Google Apps Script กรุณาใส่ Web App URL ในไฟล์ app.js");
  }

  showLoading(action);

  try {
    let response;
    try {
      response = await fetch(CONFIG.API_URL, {
        method: "POST",
        headers: {"Content-Type": "text/plain;charset=utf-8"},
        body: JSON.stringify({
          action,
          token: localStorage.getItem("dsnToken") || "",
          ...payload
        })
      });
    } catch (error) {
      throw new Error("เชื่อมต่อระบบไม่ได้ กรุณาตรวจสอบ Web App URL และการ Deploy");
    }

    let data;
    try {
      data = await response.json();
    } catch (error) {
      throw new Error("ระบบหลังบ้านตอบกลับไม่ถูกต้อง กรุณา Deploy Google Apps Script เวอร์ชันล่าสุด");
    }

    if (!data.ok) {
      throw new Error(data.message || "เกิดข้อผิดพลาดในระบบ");
    }

    return data;
  } finally {
    hideLoading();
  }
}

document.querySelectorAll("[data-go]").forEach(btn=>btn.addEventListener("click",()=>{
  const dest=btn.dataset.go;
  if(dest.startsWith("login-")){
    state.authRole=dest.replace("login-","");
    $("authTitle").textContent=state.authRole==="student"?"เข้าสู่ระบบนักเรียน":state.authRole==="teacher"?"เข้าสู่ระบบครู":"เข้าสู่ระบบผู้ดูแลระบบ";
    showView("auth");
  } else showView(dest);
}));
$("backBtn").onclick=()=>showView(state.history.pop() || "home",false);
$("logoutBtn").onclick=()=>{localStorage.removeItem("dsnToken");state.user=null;state.profile=null;$("userMenu").classList.add("hidden");showView("home",false)};

$("loginForm").addEventListener("submit",async e=>{
  e.preventDefault();
  try{
    const data=await api("login",{email:$("loginEmail").value.trim(),password:$("loginPassword").value,role:state.authRole});
    localStorage.setItem("dsnToken",data.token); state.user=data.user;state.profile=data.profile;
    $("userMenu").classList.remove("hidden");
    if(data.user.mustChangePassword){
      const dialog=$("passwordChangeDialog");
      if(dialog) dialog.showModal();
      return;
    }
    if(!data.user.profileCompleted){configureProfile(data.user.role);showView("profile");return}
    await openDashboard(data.user.role);
  }catch(err){toast(err.message)}
});
$("forgotBtn").onclick=()=>showView("forgot");
$("forgotForm").addEventListener("submit",async e=>{e.preventDefault();try{await api("forgotPassword",{email:$("forgotEmail").value.trim()});toast("ส่งคำขอเรียบร้อยแล้ว กรุณาตรวจสอบอีเมล");showView("auth")}catch(err){toast(err.message)}});

$("registerForm").addEventListener("submit",async e=>{
  e.preventDefault(); const role=document.querySelector('input[name="role"]:checked').value;
  if($("regPassword").value!==$("regPassword2").value)return toast("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
  try{const data=await api("register",{role,email:$("regEmail").value.trim(),password:$("regPassword").value,consent:true});
    localStorage.setItem("dsnToken",data.token);state.user={...data.user,profileCompleted:false};configureProfile(role);showView("profile");
  }catch(err){toast(err.message)}
});

function configureProfile(role){
  const student=role==="student";$("studentIdWrap").classList.toggle("hidden",!student);$("classNumberWrap").classList.toggle("hidden",!student);
  $("parentNameWrap").classList.toggle("hidden",!student);$("parentPhoneWrap").classList.toggle("hidden",!student);$("teamNotice").classList.toggle("hidden",!student);
  $("profileTitle").textContent=student?"กรอกข้อมูลนักเรียน":"กรอกข้อมูลครูที่ปรึกษา";
}
$("gradeLevel").addEventListener("change",()=>{
  const grade=$("gradeLevel").value,max=["M1","M2","M3"].includes(grade)?14:12;
  $("classroom").innerHTML='<option value="">เลือกห้อง</option>'+Array.from({length:max},(_,i)=>`<option value="${i+1}">ห้อง ${i+1}</option>`).join("");
});
$("profileForm").addEventListener("submit",async e=>{
  e.preventDefault(); const role=state.user?.role||"student";
  const profile={prefix:$("prefix").value,firstName:$("firstName").value.trim(),lastName:$("lastName").value.trim(),studentId:$("studentId").value.trim(),
    numberInClass:Number($("classNumber").value||0),gradeLevel:$("gradeLevel").value,classroom:$("classroom").value,classCode:`${$("gradeLevel").value}-${$("classroom").value}`,
    phone:$("phone").value.trim(),parentName:$("parentName").value.trim(),parentPhone:$("parentPhone").value.trim()};
  try{await api("saveProfile",{profile});state.profile=profile;state.user.profileCompleted=true;await openDashboard(role)}catch(err){toast(err.message)}
});

async function openDashboard(role){
  $("userMenu").classList.remove("hidden");$("activeYearBadge").textContent=`ปีการศึกษา ${state.academicYear}`;
  if(role==="student"){renderStudent();showView("student")}
  if(role==="teacher"){await loadTeacher();showView("teacher")}
  if(role==="admin"){await loadAdmin();showView("admin")}
}

async function renderStudent(){
  const p=state.profile||{};$("studentWelcome").textContent=`สวัสดี ${p.firstName||""} ${p.lastName||""}`;$("studentClass").textContent=`ห้อง ${formatClass(p.classCode)} เลขที่ ${p.numberInClass||"-"}`;
  $("studentTeamCard").innerHTML=`<div class="info-row"><span>ห้องเรียน</span><strong>${formatClass(p.classCode)}</strong></div><div class="info-row"><span>ครูที่ปรึกษา</span><strong>${p.teacherName||"รอครูลงทะเบียน"}</strong></div>`;
  const data=await api("getLocation"); const loc=data.location; const mapped=!!loc || p.locationStatus==="Submitted";
  $("studentStatus").textContent=mapped?"ปักหมุดบ้านแล้ว":"ยังไม่ได้ปักหมุดบ้าน";$("studentStatus").className=`status-pill ${mapped?"success":"danger"}`;
  const address = loc ? buildAddress(loc) : "";
  const hasCoords = loc && Number.isFinite(Number(loc.latitude)) && Number.isFinite(Number(loc.longitude));
  $("studentLocationSummary").innerHTML=loc?`<div class="info-stack">
    <div class="info-row"><span>ที่อยู่</span><strong>${address || "-"}</strong></div>
    <div class="info-row"><span>พิกัด</span><strong>${hasCoords ? `${Number(loc.latitude).toFixed(6)}, ${Number(loc.longitude).toFixed(6)}` : "-"}</strong></div>
    ${loc.landmark ? `<div class="info-row"><span>จุดสังเกต</span><strong>${escapeHtml(loc.landmark)}</strong></div>` : ""}
    ${loc.addressDetails ? `<div class="info-row"><span>รายละเอียดเพิ่มเติม</span><strong>${escapeHtml(loc.addressDetails)}</strong></div>` : ""}
  </div>`:"ยังไม่มีข้อมูลบ้าน";
  $("editLocationBtn").classList.toggle("hidden",!loc);
}
$("openLocationFormBtn").onclick=()=>showView("consent");$("editLocationBtn").onclick=()=>showView("consent");
$("locationConsent").onchange=e=>$("acceptConsentBtn").disabled=!e.target.checked;
$("acceptConsentBtn").onclick=()=>showView("location");

function initMap(){
  if(state.map){setTimeout(()=>state.map.invalidateSize(),100);return}
  state.map=L.map("map").setView(CONFIG.SCHOOL_COORDS,12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(state.map);
  L.marker(CONFIG.SCHOOL_COORDS).addTo(state.map).bindPopup(CONFIG.SCHOOL_NAME);
  state.map.on("click",e=>setMarker(e.latlng.lat,e.latlng.lng));
  api("getLocation").then(d=>{
    if(!d.location) return;
    const loc=d.location;
    if(Number.isFinite(Number(loc.latitude)) && Number.isFinite(Number(loc.longitude))){
      setMarker(Number(loc.latitude),Number(loc.longitude),true);
    }
    fillLocationForm(loc);
  }).catch(err=>toast(err.message));
}
function setMarker(lat,lng,pan=false){state.lat=lat;state.lng=lng;if(state.marker)state.marker.setLatLng([lat,lng]);else state.marker=L.marker([lat,lng],{draggable:true}).addTo(state.map).on("dragend",e=>{const p=e.target.getLatLng();setMarker(p.lat,p.lng)});
  $("coordinateText").textContent=`${lat.toFixed(6)}, ${lng.toFixed(6)}`;if(pan)state.map.setView([lat,lng],15);
}
$("locateMeBtn").onclick=()=>navigator.geolocation?navigator.geolocation.getCurrentPosition(p=>setMarker(p.coords.latitude,p.coords.longitude,true),()=>toast("ไม่สามารถอ่านตำแหน่งปัจจุบันได้")):toast("อุปกรณ์นี้ไม่รองรับตำแหน่ง");
$("locationForm").addEventListener("submit",async e=>{
  e.preventDefault();if(state.lat==null)return toast("กรุณาปักหมุดบ้านบนแผนที่");
  const location={houseNumber:$("houseNumber").value,moo:$("moo").value,village:$("village").value,soi:$("soi").value,road:$("road").value,
    subdistrict:$("subdistrict").value,district:$("district").value,province:$("province").value,postalCode:$("postalCode").value,landmark:$("landmark").value,
    contactName:$("contactName").value,contactPhone:$("contactPhone").value,
    addressDetails:$("addressDetails").value,latitude:state.lat,longitude:state.lng,consent:true};
  try{await api("saveLocation",{location});state.profile.locationStatus="Submitted";toast("บันทึกข้อมูลบ้านเรียบร้อยแล้ว");await renderStudent();showView("student")}catch(err){toast(err.message)}
});

async function loadTeacher(){
  const d=await api("getTeacherDashboard");state.students=d.students||[];state.savedGroups=d.groups||[];
  const p=state.profile||{};$("teacherWelcome").textContent=`คุณครู ${p.firstName||""} ${p.lastName||""}`;$("teacherClass").textContent=`ครูที่ปรึกษาห้อง ${formatClass(p.classCode)}`;
  renderStudentTable(state.students);renderSavedGroups();
}
function renderStudentTable(list){
  const sorted=[...list].sort((a,b)=>Number(a.numberInClass)-Number(b.numberInClass));
  $("metricTotal").textContent=sorted.length;$("metricJoined").textContent=sorted.filter(x=>x.teamStatus==="Joined").length;
  $("metricMapped").textContent=sorted.filter(x=>x.locationStatus==="Submitted").length;$("metricUnmapped").textContent=sorted.filter(x=>x.locationStatus!=="Submitted").length;
  $("studentTableBody").innerHTML=sorted.map(s=>`<tr><td>${s.numberInClass||"-"}</td><td><strong>${s.firstName} ${s.lastName}</strong></td><td><span class="table-status success">เข้าร่วมแล้ว</span></td>
    <td><span class="table-status ${s.locationStatus==="Submitted"?"success":"danger"}">${s.locationStatus==="Submitted"?"ปักหมุดบ้านแล้ว":"ยังไม่ปักหมุด"}</span></td>
    <td><button class="ghost-btn detail-btn" data-id="${s.studentId}">ดูข้อมูล</button></td></tr>`).join("");
  document.querySelectorAll(".detail-btn").forEach(b=>b.onclick=()=>showStudentDetail(b.dataset.id));
}
$("studentSearch").oninput=e=>{const q=e.target.value.toLowerCase();renderStudentTable(state.students.filter(s=>`${s.firstName} ${s.lastName}`.toLowerCase().includes(q)))};
function showStudentDetail(id){
  const s=state.students.find(x=>String(x.studentId)===String(id));
  if(!s){ toast("ไม่พบข้อมูลนักเรียน"); return; }

  $("dialogTitle").textContent=`${s.firstName||""} ${s.lastName||""}`.trim() || "รายละเอียดนักเรียน";
  const mapped=s.locationStatus==="Submitted";
  const hasCoords=Number.isFinite(Number(s.latitude)) && Number.isFinite(Number(s.longitude));
  const mapButton=mapped && hasCoords
    ? `<a class="primary-btn" target="_blank" rel="noopener" href="https://www.google.com/maps?q=${s.latitude},${s.longitude}">เปิดตำแหน่งใน Google Maps</a>`
    : "";

  $("dialogBody").innerHTML=`
    <div class="info-stack">
      <div class="info-row"><span>เลขที่</span><strong>${s.numberInClass||"-"}</strong></div>
      <div class="info-row"><span>ห้องเรียน</span><strong>${formatClass(s.classCode)}</strong></div>
      <div class="info-row"><span>สถานะบ้าน</span><strong>${mapped?"ปักหมุดบ้านแล้ว":"ยังไม่ปักหมุดบ้าน"}</strong></div>
      <div class="info-row"><span>ผู้ปกครอง</span><strong>${escapeHtml(s.parentName||"-")}</strong></div>
      <div class="info-row"><span>เบอร์ผู้ปกครอง</span><strong>${escapeHtml(s.parentPhone||"-")}</strong></div>
      ${mapped?`
        <div class="info-row"><span>ที่อยู่</span><strong>${escapeHtml(s.address||"-")}</strong></div>
        <div class="info-row"><span>พิกัด</span><strong>${hasCoords?`${Number(s.latitude).toFixed(6)}, ${Number(s.longitude).toFixed(6)}`:"-"}</strong></div>
        <div class="info-row"><span>จุดสังเกต</span><strong>${escapeHtml(s.landmark||"-")}</strong></div>
        <div class="info-row"><span>รายละเอียดเพิ่มเติม</span><strong>${escapeHtml(s.addressDetails||"-")}</strong></div>
        <div class="info-row"><span>ผู้ติดต่อ</span><strong>${escapeHtml(s.contactName||"-")}</strong></div>
        <div class="info-row"><span>เบอร์โทรศัพท์</span><strong>${escapeHtml(s.contactPhone||"-")}</strong></div>
        ${mapButton}
      `:""}
    </div>`;
  $("detailDialog").showModal();
}
$("closeDialogBtn").onclick=()=>$("detailDialog").close();
$("calculateRouteBtn").onclick=()=>showView("route-options");
document.querySelectorAll('input[name="routeMode"]').forEach(r=>r.onchange=()=>$("fixedSizeOptions").classList.toggle("hidden",r.value!=="fixed"||!r.checked));
$("routeOptionsForm").addEventListener("submit",async e=>{
  e.preventDefault();const mode=document.querySelector('input[name="routeMode"]:checked').value;let size=6;
  if(mode==="fixed"){size=Number($("customGroupSize").value||document.querySelector('input[name="groupSize"]:checked')?.value||0);if(!size)return toast("กรุณาเลือกจำนวนหลังต่อกลุ่ม")}
  try{const d=await api("calculateGroups",{mode,groupSize:size});state.groups=d.groups;renderGroups();showView("route-groups")}catch(err){toast(err.message)}
});
function renderGroups(){
  const mapped=state.groups.reduce((n,g)=>n+g.members.length,0);$("routeSummary").innerHTML=`<div class="metric"><span>จำนวนกลุ่ม</span><strong>${state.groups.length}</strong></div><div class="metric"><span>บ้านทั้งหมด</span><strong>${mapped}</strong></div><div class="metric success"><span>จุดเริ่มต้น</span><strong style="font-size:18px">โรงเรียน</strong></div><div class="metric success"><span>จุดสิ้นสุด</span><strong style="font-size:18px">โรงเรียน</strong></div>`;
  $("routeGroups").innerHTML=state.groups.map((g,gi)=>`<article class="route-group" data-group="${gi}">
    <div class="route-group-head"><h3><input value="${g.groupName}" data-name="${gi}"></h3><span class="badge">${g.members.length} หลัง</span></div>
    <div class="group-map-link"><a target="_blank" href="${googleMapsRoute(g.members)}">เปิดเส้นทางใน Google Maps</a></div>
    <div>${g.members.map((s,si)=>`<div class="student-chip" draggable="true" data-group="${gi}" data-index="${si}"><span class="drag-handle">⋮⋮</span><div><strong>${si+1}. ${s.firstName} ${s.lastName}</strong><small>${s.district||""}</small></div><div class="chip-actions"><button class="mini-btn up" type="button">↑</button><button class="mini-btn down" type="button">↓</button></div></div>`).join("")}</div>
  </article>`).join("");
  bindGroupEvents();
}
function bindGroupEvents(){
  document.querySelectorAll("[data-name]").forEach(i=>i.onchange=()=>state.groups[Number(i.dataset.name)].groupName=i.value);
  document.querySelectorAll(".student-chip").forEach(chip=>{
    chip.ondragstart=e=>e.dataTransfer.setData("text/plain",JSON.stringify({group:+chip.dataset.group,index:+chip.dataset.index}));
    chip.querySelector(".up").onclick=()=>moveWithin(+chip.dataset.group,+chip.dataset.index,-1);
    chip.querySelector(".down").onclick=()=>moveWithin(+chip.dataset.group,+chip.dataset.index,1);
  });
  document.querySelectorAll(".route-group").forEach(group=>{group.ondragover=e=>e.preventDefault();group.ondrop=e=>{e.preventDefault();const from=JSON.parse(e.dataTransfer.getData("text/plain"));const item=state.groups[from.group].members.splice(from.index,1)[0];state.groups[+group.dataset.group].members.push(item);renderGroups()}});
}
function moveWithin(g,i,dir){const arr=state.groups[g].members,j=i+dir;if(j<0||j>=arr.length)return;[arr[i],arr[j]]=[arr[j],arr[i]];renderGroups()}
$("recalculateBtn").onclick=()=>showView("route-options");
$("saveGroupsBtn").onclick=async()=>{try{await api("saveGroups",{groups:state.groups});toast("บันทึกแผนเยี่ยมบ้านเรียบร้อยแล้ว");showView("teacher")}catch(err){toast(err.message)}};
function renderSavedGroups(){const el=$("savedGroups");if(!state.savedGroups?.length){el.className="group-list empty-state";el.textContent="ยังไม่มีแผนที่บันทึกไว้";return}
  el.className="group-list";el.innerHTML=state.savedGroups.map(g=>`<div class="info-row"><span>${g.groupName}</span><strong>${g.members?.length||0} หลัง</strong></div>`).join("")}

async function loadAdmin() {
  const d = await api("getAdminDashboard");
  state.academicYear = String(d.academicYear || state.academicYear);

  const badge = $("activeYearBadge");
  if (badge) badge.textContent = `ปีการศึกษา ${state.academicYear}`;
  const currentYearText = $("currentAcademicYearText");
  if (currentYearText) currentYearText.textContent = state.academicYear;

  const labels = {users:"สมาชิกทั้งหมด",teachers:"ครู",students:"นักเรียน",mapped:"ปักหมุดแล้ว"};
  $("adminMetrics").innerHTML = Object.entries(d.metrics || {}).map(([key,value]) => `
    <div class="info-row"><span>${labels[key] || key}</span><strong>${value}</strong></div>
  `).join("");

  state.accounts = d.accounts || [];
  renderAccounts(state.accounts);
  renderArchiveYears(d.archiveYears || []);
}

function renderAccounts(list) {
  $("accountTableBody").innerHTML = list.map(a => `
    <tr>
      <td>${escapeHtml(a.email)}</td>
      <td>${escapeHtml(a.role)}</td>
      <td>${escapeHtml(a.name || "-")}</td>
      <td>${formatClass(a.classCode)}</td>
      <td><span class="table-status ${a.status === "Active" ? "success" : "danger"}">${escapeHtml(a.status)}</span></td>
      <td>
        <div class="admin-actions">
          <button class="ghost-btn edit-account" data-user-id="${a.userId}">แก้ไข</button>
          <button class="ghost-btn temp-password" data-user-id="${a.userId}">รหัสชั่วคราว</button>
          <button class="ghost-btn toggle-account" data-user-id="${a.userId}">${a.status === "Active" ? "ระงับ" : "เปิดใช้งาน"}</button>
          <button class="danger-btn delete-account" data-user-id="${a.userId}">ลบ</button>
        </div>
      </td>
    </tr>
  `).join("");
  bindAdminAccountButtons();
}

function bindAdminAccountButtons() {
  document.querySelectorAll(".edit-account").forEach(btn => btn.onclick = () => openEditAccount(btn.dataset.userId));
  document.querySelectorAll(".temp-password").forEach(btn => btn.onclick = () => setTemporaryPassword(btn.dataset.userId));
  document.querySelectorAll(".toggle-account").forEach(btn => btn.onclick = () => toggleMemberAccount(btn.dataset.userId));
  document.querySelectorAll(".delete-account").forEach(btn => btn.onclick = () => deleteMemberAccount(btn.dataset.userId));
}

function findAccount(userId) {
  return state.accounts.find(a => String(a.userId) === String(userId));
}

function openEditAccount(userId) {
  const a = findAccount(userId);
  if (!a) return toast("ไม่พบข้อมูลสมาชิก");
  $("editUserId").value = a.userId;
  $("editEmail").value = a.email || "";
  $("editFirstName").value = a.firstName || "";
  $("editLastName").value = a.lastName || "";
  $("editGradeLevel").value = a.gradeLevel || "";
  $("editClassroom").value = a.classroom || "";
  $("editNumberInClass").value = a.numberInClass || "";
  $("editAccountDialog").showModal();
}

$("closeEditAccountBtn").onclick = () => $("editAccountDialog").close();
$("editAccountForm").onsubmit = async e => {
  e.preventDefault();
  try {
    await api("updateAccount", {
      userId: $("editUserId").value,
      email: $("editEmail").value.trim(),
      firstName: $("editFirstName").value.trim(),
      lastName: $("editLastName").value.trim(),
      gradeLevel: $("editGradeLevel").value,
      classroom: $("editClassroom").value,
      numberInClass: $("editNumberInClass").value
    });
    $("editAccountDialog").close();
    toast("แก้ไขข้อมูลสมาชิกเรียบร้อยแล้ว");
    await loadAdmin();
  } catch (err) { toast(err.message); }
};

async function setTemporaryPassword(userId) {
  const a = findAccount(userId);
  if (!a) return toast("ไม่พบข้อมูลสมาชิก");
  const password = prompt(`ตั้งรหัสผ่านชั่วคราวสำหรับ ${a.email}\nต้องมีอย่างน้อย 8 ตัวอักษร`);
  if (password === null) return;
  if (password.length < 8) return toast("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
  try {
    await api("setTemporaryPassword", {userId, password});
    toast("ตั้งรหัสผ่านชั่วคราวแล้ว สมาชิกต้องเปลี่ยนรหัสเมื่อเข้าสู่ระบบ");
  } catch (err) { toast(err.message); }
}

async function toggleMemberAccount(userId) {
  try {
    await api("toggleAccount", {userId});
    toast("อัปเดตสถานะบัญชีเรียบร้อยแล้ว");
    await loadAdmin();
  } catch (err) { toast(err.message); }
}

async function deleteMemberAccount(userId) {
  const a = findAccount(userId);
  if (!a) return toast("ไม่พบข้อมูลสมาชิก");
  if (!confirm(`ยืนยันลบบัญชี ${a.email} ?\nการลบไม่สามารถย้อนกลับได้`)) return;
  try {
    await api("deleteAccount", {userId});
    toast("ลบบัญชีเรียบร้อยแล้ว");
    await loadAdmin();
  } catch (err) { toast(err.message); }
}

$("accountSearch").oninput = e => {
  const q = e.target.value.toLowerCase();
  renderAccounts(state.accounts.filter(a => `${a.email} ${a.name} ${a.classCode}`.toLowerCase().includes(q)));
};

function renderArchiveYears(years) {
  const select = $("archiveYearSelect");
  select.innerHTML = '<option value="">เลือกปีการศึกษา</option>' + years.map(y => `<option value="${y}">${y}</option>`).join("");
}

$("archiveYearSelect").onchange = async e => {
  const year = e.target.value;
  if (!year) { $("archiveSummary").textContent = "ยังไม่ได้เลือกปีการศึกษา"; return; }
  try {
    const d = await api("getArchiveData", {year});
    const a = d.archive;
    $("archiveSummary").innerHTML = `
      <div class="info-stack">
        <div class="info-row"><span>ปีการศึกษา</span><strong>${escapeHtml(a.year)}</strong></div>
        <div class="info-row"><span>วันที่ปิดปี</span><strong>${escapeHtml(a.closedAtText || "-")}</strong></div>
        <div class="info-row"><span>ครู</span><strong>${a.teachers}</strong></div>
        <div class="info-row"><span>นักเรียน</span><strong>${a.students}</strong></div>
        <div class="info-row"><span>ปักหมุดแล้ว</span><strong>${a.mapped}</strong></div>
        <div class="info-row"><span>กลุ่มเยี่ยมบ้าน</span><strong>${a.groups}</strong></div>
        ${a.backupUrl ? `<a class="primary-btn" target="_blank" rel="noopener" href="${a.backupUrl}">เปิดไฟล์สำรองปีการศึกษา</a>` : ""}
      </div>`;
  } catch (err) { toast(err.message); }
};

$("openCloseYearBtn").onclick = async () => {
  try {
    const d = await api("getCloseYearPreview");
    const p = d.preview;
    $("closeYearPreview").innerHTML = `
      <div class="info-row"><span>ปีการศึกษาที่จะปิด</span><strong>${p.year}</strong></div>
      <div class="info-row"><span>ปีการศึกษาใหม่</span><strong>${p.nextYear}</strong></div>
      <div class="info-row"><span>ครู</span><strong>${p.teachers}</strong></div>
      <div class="info-row"><span>นักเรียน</span><strong>${p.students}</strong></div>
      <div class="info-row"><span>นักเรียน ม.6 เป็นศิษย์เก่า</span><strong>${p.graduates}</strong></div>`;
    $("closeYearDialog").showModal();
  } catch (err) { toast(err.message); }
};
$("closeYearDialogBtn").onclick = () => $("closeYearDialog").close();
$("cancelCloseYearBtn").onclick = () => $("closeYearDialog").close();
$("closeYearForm").onsubmit = async e => {
  e.preventDefault();
  if (!confirm("ยืนยันปิดปีการศึกษาและเลื่อนชั้นข้อมูลทั้งหมด?")) return;
  try {
    const d = await api("closeAcademicYear");
    $("closeYearDialog").close();
    toast(`ปิดปีการศึกษาแล้ว ระบบเปลี่ยนเป็นปี ${d.nextYear}`);
    await loadAdmin();
  } catch (err) { toast(err.message); }
};

$("passwordChangeForm").onsubmit = async e => {
  e.preventDefault();
  const password = $("newOwnPassword").value;
  const confirmPassword = $("confirmOwnPassword").value;
  if (password !== confirmPassword) return toast("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
  try {
    await api("changeOwnPassword", {password});
    state.user.mustChangePassword = false;
    $("passwordChangeDialog").close();
    $("passwordChangeForm").reset();
    toast("ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว");
    if (!state.user.profileCompleted) { configureProfile(state.user.role); showView("profile"); return; }
    await openDashboard(state.user.role);
  } catch (err) { toast(err.message); }
};

function formatClass(c){if(!c)return"-";return c.replace(/^M(\d)-(\d+)$/,"ม.$1/$2")}
function fillLocationForm(loc){
  const fields=["houseNumber","moo","village","soi","road","subdistrict","district","province","postalCode","landmark","contactName","contactPhone","addressDetails"];
  fields.forEach(id=>{ if($(id) && loc[id]!==undefined && loc[id]!==null) $(id).value=loc[id]; });
}
function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
}
function buildAddress(l){return [l.houseNumber,l.moo&&`หมู่ ${l.moo}`,l.village,l.soi&&`ซอย ${l.soi}`,l.road&&`ถนน ${l.road}`,l.subdistrict,l.district,l.province,l.postalCode].filter(Boolean).join(" ")}
function googleMapsRoute(members){const s=CONFIG.SCHOOL_COORDS.join(",");const pts=members.map(x=>`${x.latitude},${x.longitude}`);const waypoints=pts.join("|");return `https://www.google.com/maps/dir/?api=1&origin=${s}&destination=${s}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`}


window.addEventListener("pageshow", () => hideLoading(true));
window.addEventListener("load", () => hideLoading(true));
