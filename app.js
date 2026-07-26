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
  deleteVisitGroup: ["กำลังลบแผนเยี่ยมบ้าน","กรุณารอสักครู่"],
  completeVisitGroup: ["กำลังบันทึกผลการเยี่ยมบ้าน", "กรุณารอสักครู่"],
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

async function loadTeacher() {
  const data = await api("getTeacherDashboard");

  state.students = data.students || [];

  const allGroups = data.groups || [];

  state.savedGroups = allGroups.filter(group =>
    String(group.groupStatus || "Confirmed") !== "Completed"
  );

  state.completedGroups = allGroups.filter(group =>
    String(group.groupStatus) === "Completed"
  );

  const profile = state.profile || {};

  $("teacherWelcome").textContent =
    `คุณครู ${profile.firstName || ""} ${profile.lastName || ""}`;

  $("teacherClass").textContent =
    `ครูที่ปรึกษาห้อง ${formatClass(profile.classCode)}`;

  renderStudentTable(state.students);
  renderSavedGroups();
  renderCompletedGroups();
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
$("routeOptionsForm").addEventListener("submit", async event => {
  event.preventDefault();

  const mode = document.querySelector(
    'input[name="routeMode"]:checked'
  ).value;

  let size = 6;

  if (mode === "fixed") {
    size = Number(
      $("customGroupSize").value ||
      document.querySelector(
        'input[name="groupSize"]:checked'
      )?.value ||
      0
    );

    if (!size) {
      return toast("กรุณาเลือกจำนวนหลังต่อกลุ่ม");
    }
  }

  try {
    const data = await api("calculateGroups", {
      mode,
      groupSize: size
    });

    state.groups = (data.groups || []).map(group => ({
      ...group,
      members: [...(group.members || [])].reverse()
    }));

    renderGroups();
    showView("route-groups");
  } catch (error) {
    toast(error.message);
  }
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
$("saveGroupsBtn").onclick = async () => {
  try {
    await api("saveGroups", {
      groups: state.groups
    });

    toast("บันทึกแผนเยี่ยมบ้านเรียบร้อยแล้ว");

    await loadTeacher();
    showView("teacher");
  } catch (error) {
    toast(error.message);
  }
};

function renderSavedGroups() {
  const container = $("savedGroups");
  const section = $("savedGroupsSection");
  const groups = state.savedGroups || [];

  if (!groups.length) {
    section?.classList.remove("hidden");
    container.className = "group-list empty-state";
    container.textContent = "ยังไม่มีแผนที่บันทึกไว้";
    return;
  }

  section?.classList.remove("hidden");
  container.className = "group-list";

  container.innerHTML = groups.map((group, index) => `
    <div class="saved-group-row">
      <div class="saved-group-info">
        <strong>
          ${escapeHtml(group.groupName || `กลุ่มที่ ${index + 1}`)}
        </strong>

        <span>
          ${group.members?.length || 0} หลัง
        </span>
      </div>

      <div class="saved-group-actions">
  <button
    class="ghost-btn open-saved-plan"
    type="button"
    data-group-id="${escapeHtml(group.groupId || "")}"
  >
    เปิดดูและแก้ไข
  </button>

  <button
    class="primary-btn complete-visit-btn"
    type="button"
    data-group-id="${escapeHtml(group.groupId || "")}"
  >
    เยี่ยมบ้านเสร็จสิ้น
  </button>

  <button
    class="delete-plan-btn delete-saved-plan"
    type="button"
    data-group-id="${escapeHtml(group.groupId || "")}"
  >
    ลบแผนนี้
  </button>
</div>
    </div>
  `).join("");

  document.querySelectorAll(".open-saved-plan").forEach(button => {
    button.onclick = () => {
      openSavedPlan(button.dataset.groupId);
    };
  });

  document.querySelectorAll(".complete-visit-btn").forEach(button => {
    button.onclick = () => {
      openCompleteVisitDialog(button.dataset.groupId);
    };
  });
}
document.querySelectorAll(".delete-saved-plan").forEach(button => {
  button.onclick = () => {
    deleteSavedPlan(button.dataset.groupId);
  };
});

function openSavedPlan(groupId) {
  const selectedGroup = (state.savedGroups || []).find(group =>
    String(group.groupId) === String(groupId)
  );

  if (!selectedGroup) {
    return toast("ไม่พบข้อมูลแผนเยี่ยมบ้าน");
  }

  /*
    เปิดทั้งชุด เพื่อให้ยังสามารถลากนักเรียน
    หรือย้ายข้ามกลุ่มได้เหมือนเดิม
  */
  state.groups = (state.savedGroups || []).map(group => ({
    groupId: group.groupId,
    groupName: group.groupName,
    members: (group.members || []).map(member => ({
      ...member
    }))
  }));

  renderGroups();
  showView("route-groups");
}
async function deleteSavedPlan(groupId) {
  const group = (state.savedGroups || []).find(item =>
    String(item.groupId) === String(groupId)
  );

  if (!group) {
    return toast("ไม่พบข้อมูลแผนเยี่ยมบ้าน");
  }

  const confirmed = confirm(
    `ยืนยันลบแผน “${group.groupName || "กลุ่มเยี่ยมบ้าน"}” ?\n\n` +
    `แผนและข้อมูลสมาชิกในกลุ่มนี้จะถูกลบออกจากชีตถาวร\n` +
    `การลบไม่สามารถย้อนกลับได้`
  );

  if (!confirmed) return;

  try {
    await api("deleteVisitGroup", {
      groupId: group.groupId
    });

    toast("ลบแผนเยี่ยมบ้านเรียบร้อยแล้ว");

    await loadTeacher();
  } catch (error) {
    toast(error.message);
  }
}
function openCompleteVisitDialog(groupId) {
  const group = (state.savedGroups || []).find(item =>
    String(item.groupId) === String(groupId)
  );

  if (!group) {
    return toast("ไม่พบกลุ่มเยี่ยมบ้าน");
  }

  $("completeVisitGroupId").value = group.groupId;

  $("completeVisitGroupSummary").innerHTML = `
    <strong>${escapeHtml(group.groupName || "กลุ่มเยี่ยมบ้าน")}</strong>
    <span>${group.members?.length || 0} หลัง</span>
  `;

  /*
    ใส่วันที่ปัจจุบันให้อัตโนมัติ
    แต่ครูยังแก้วันได้
  */
  $("completeVisitDate").value = getLocalDateInputValue();

  $("completeVisitDialog").showModal();
}

function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
$("closeCompleteVisitDialogBtn").onclick = () => {
  $("completeVisitDialog").close();
};

$("cancelCompleteVisitBtn").onclick = () => {
  $("completeVisitDialog").close();
};

$("completeVisitForm").onsubmit = async event => {
  event.preventDefault();

  const groupId = $("completeVisitGroupId").value;
  const visitDate = $("completeVisitDate").value;

  if (!groupId) {
    return toast("ไม่พบกลุ่มเยี่ยมบ้าน");
  }

  if (!visitDate) {
    return toast("กรุณาเลือกวันที่เยี่ยมบ้าน");
  }

  const group = (state.savedGroups || []).find(item =>
    String(item.groupId) === String(groupId)
  );

  if (!group) {
    return toast("ไม่พบข้อมูลกลุ่มเยี่ยมบ้าน");
  }

  const confirmed = confirm(
    `ยืนยันว่าเยี่ยมบ้าน “${group.groupName}” เสร็จแล้ว\nวันที่ ${formatThaiDate(visitDate)}`
  );

  if (!confirmed) return;

  try {
    await api("completeVisitGroup", {
      groupId,
      visitDate
    });

    $("completeVisitDialog").close();

    toast("บันทึกการเยี่ยมบ้านเสร็จสิ้นแล้ว");

    await loadTeacher();
  } catch (error) {
    toast(error.message);
  }
};

function renderCompletedGroups() {
  const section = $("completedGroupsSection");
  const container = $("completedGroups");
  const groups = state.completedGroups || [];

  if (!groups.length) {
    section?.classList.add("hidden");
    container.className = "group-list empty-state";
    container.textContent = "ยังไม่มีแผนที่เยี่ยมบ้านเสร็จแล้ว";
    return;
  }

  section?.classList.remove("hidden");
  container.className = "group-list";

  container.innerHTML = groups.map((group, index) => `
    <div class="saved-group-row completed-group-row">
      <div class="saved-group-info">
        <strong>
          ${escapeHtml(group.groupName || `กลุ่มที่ ${index + 1}`)}
        </strong>

        <span>
          ${group.members?.length || 0} หลัง
          · เยี่ยมวันที่ ${formatThaiDate(group.visitDate)}
        </span>
      </div>

      <div class="saved-group-actions">
        <button
          class="ghost-btn open-completed-visit"
          type="button"
          data-group-id="${escapeHtml(group.groupId || "")}"
        >
          เปิดดูข้อมูล
        </button>
      </div>
    </div>
  `).join("");

  document.querySelectorAll(".open-completed-visit").forEach(button => {
    button.onclick = () => {
      openCompletedVisitDetail(button.dataset.groupId);
    };
  });
}

function openCompletedVisitDetail(groupId) {
  const group = (state.completedGroups || []).find(item =>
    String(item.groupId) === String(groupId)
  );

  if (!group) {
    return toast("ไม่พบข้อมูลการเยี่ยมบ้าน");
  }

  $("completedVisitDetailTitle").textContent =
    group.groupName || "รายละเอียดการเยี่ยมบ้าน";

  const members = group.members || [];

  $("completedVisitDetailBody").innerHTML = `
    <div class="info-stack">
      <div class="info-row">
        <span>วันที่เยี่ยมบ้าน</span>
        <strong>${formatThaiDate(group.visitDate)}</strong>
      </div>

      <div class="info-row">
        <span>จำนวนบ้าน</span>
        <strong>${members.length} หลัง</strong>
      </div>
    </div>

    <div class="completed-member-list">
      ${members.map((member, index) => `
        <div class="completed-member-item">
          <div>
            <strong>
              ${index + 1}.
              ${escapeHtml(member.firstName || "")}
              ${escapeHtml(member.lastName || "")}
            </strong>

            <span>
              เลขที่ ${escapeHtml(member.numberInClass || "-")}
            </span>
          </div>

          <small>
            ${escapeHtml(member.address || member.district || "-")}
          </small>
        </div>
      `).join("")}
    </div>

    ${
      members.some(member =>
        Number.isFinite(Number(member.latitude)) &&
        Number.isFinite(Number(member.longitude))
      )
        ? `
          <a
            class="primary-btn completed-map-link"
            target="_blank"
            rel="noopener"
            href="${googleMapsRoute(members)}"
          >
            เปิดเส้นทางย้อนหลังใน Google Maps
          </a>
        `
        : ""
    }
  `;

  $("completedVisitDetailDialog").showModal();
}

$("closeCompletedVisitDetailBtn").onclick = () => {
  $("completedVisitDetailDialog").close();
};

function formatThaiDate(value) {
  if (!value) return "-";

  const text = String(value);
  const datePart = text.includes("T")
    ? text.split("T")[0]
    : text;

  const parts = datePart.split("-");

  if (parts.length !== 3) {
    return escapeHtml(text);
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  const months = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม"
  ];

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !months[month - 1]
  ) {
    return escapeHtml(text);
  }

  return `${day} ${months[month - 1]} ${year + 543}`;
}

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
  $("accountTableBody").innerHTML = list.map(account => {
    const email = escapeHtml(account.email || "");
    const role = escapeHtml(account.role || "");
    const name = escapeHtml(account.name || "-");
    const className = formatClass(account.classCode);
    const status = escapeHtml(account.status || "-");

    return `
      <tr>
        <td>${email}</td>
        <td>${role}</td>
        <td>${name}</td>
        <td>${className}</td>
        <td>
          <span class="table-status ${account.status === "Active" ? "success" : "danger"}">
            ${status}
          </span>
        </td>
        <td>
          <div class="admin-actions">
            <button
              class="ghost-btn edit-account"
              data-email="${email}"
              type="button">
              แก้ไข
            </button>

            <button
  class="ghost-btn temporary-password"
  data-user-id="${escapeHtml(account.userId || "")}"
  data-email="${email}"
  type="button">
  รหัสชั่วคราว
</button>

            <button
              class="danger-btn delete-account"
              data-email="${email}"
              type="button">
              ลบ
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  document.querySelectorAll(".edit-account").forEach(button => {
    button.onclick = () => openEditAccount(button.dataset.email);
  });

document.querySelectorAll(".temporary-password").forEach(button => {
  button.onclick = () => setTemporaryPassword(
    button.dataset.userId,
    button.dataset.email
  );
});

  document.querySelectorAll(".delete-account").forEach(button => {
    button.onclick = () => deleteMemberAccount(button.dataset.email);
  });
}
function findAccount(identifier) {
  const value = String(identifier || "").trim().toLowerCase();

  return state.accounts.find(account =>
    String(account.userId || "").trim().toLowerCase() === value ||
    String(account.email || "").trim().toLowerCase() === value
  );
}

function openEditAccount(email) {
  const account = findAccount(email);

  if (!account) {
    return toast("ไม่พบข้อมูลสมาชิก");
  }

  $("editUserId").value = account.email || "";
  $("editEmail").value = account.email || "";
  $("editFirstName").value = account.firstName || "";
  $("editLastName").value = account.lastName || "";
  $("editGradeLevel").value = account.gradeLevel || "";
  $("editClassroom").value = account.classroom || "";
  $("editNumberInClass").value = account.numberInClass || "";

  const dialog = $("editAccountDialog");
  const dialogTitle = dialog.querySelector("h3");

  const firstNameLabel = $("editFirstName").closest("label");
  const lastNameLabel = $("editLastName").closest("label");
  const gradeLabel = $("editGradeLevel").closest("label");
  const classroomLabel = $("editClassroom").closest("label");
  const numberLabel = $("editNumberInClass").closest("label");

  [
    firstNameLabel,
    lastNameLabel,
    gradeLabel,
    classroomLabel,
    numberLabel
  ].forEach(element => {
    if (element) element.classList.remove("hidden");
  });

  if (account.role === "student") {
    dialogTitle.textContent = "แก้ไขข้อมูลนักเรียน";
    numberLabel.classList.remove("hidden");
  } else if (account.role === "teacher") {
    dialogTitle.textContent = "แก้ไขข้อมูลครู";
    numberLabel.classList.add("hidden");
    $("editNumberInClass").value = "";
  } else {
    dialogTitle.textContent = "แก้ไขบัญชีผู้ดูแลระบบ";

    [
      firstNameLabel,
      lastNameLabel,
      gradeLabel,
      classroomLabel,
      numberLabel
    ].forEach(element => {
      if (element) element.classList.add("hidden");
    });
  }

  dialog.showModal();
}

$("closeEditAccountBtn").onclick = () => {
  $("editAccountDialog").close();
};

$("editAccountForm").onsubmit = async event => {
  event.preventDefault();

  const identifier = $("editUserId").value;
  const account = findAccount(identifier);

  if (!account) {
    return toast("ไม่พบข้อมูลสมาชิก");
  }

const payload = {
  targetUserId: account.userId,
  targetEmail: account.email,
  role: account.role,
  email: $("editEmail").value.trim()
};

  if (account.role === "teacher" || account.role === "student") {
    payload.firstName = $("editFirstName").value.trim();
    payload.lastName = $("editLastName").value.trim();
    payload.gradeLevel = $("editGradeLevel").value;
    payload.classroom = $("editClassroom").value;
  }

  if (account.role === "student") {
    payload.numberInClass = $("editNumberInClass").value;
  }

  try {
    await api("updateAccount", payload);

    $("editAccountDialog").close();

    if (account.role === "student") {
      toast("แก้ไขข้อมูลนักเรียนเรียบร้อยแล้ว");
    } else if (account.role === "teacher") {
      toast("แก้ไขข้อมูลครูเรียบร้อยแล้ว");
    } else {
      toast("แก้ไขบัญชีผู้ดูแลระบบเรียบร้อยแล้ว");
    }

    await loadAdmin();
  } catch (error) {
    toast(error.message);
  }
};

async function setTemporaryPassword(userId, email) {
  const account = state.accounts.find(item =>
    String(item.userId || "") === String(userId || "") &&
    String(item.email || "").toLowerCase() === String(email || "").toLowerCase()
  );

  if (!account) {
    return toast("ข้อมูลบัญชีเป้าหมายไม่ตรงกัน กรุณาโหลดหน้าใหม่");
  }

  if (
    state.user &&
    String(account.userId) === String(state.user.userId)
  ) {
    return toast("ไม่สามารถตั้งรหัสชั่วคราวให้บัญชีแอดมินที่กำลังใช้งานอยู่");
  }

  const temporaryPassword = prompt(
    `ตั้งรหัสผ่านชั่วคราวสำหรับ ${account.email}\nต้องมีอย่างน้อย 8 ตัวอักษร`
  );

  if (temporaryPassword === null) return;

  if (temporaryPassword.length < 8) {
    return toast("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
  }

  try {
    const result = await api("setTemporaryPassword", {
      targetUserId: account.userId,
      targetEmail: account.email,
      temporaryPassword
    });

    if (
      String(result.targetUserId) !== String(account.userId) ||
      String(result.targetEmail).toLowerCase() !==
      String(account.email).toLowerCase()
    ) {
      throw new Error("ระบบตอบกลับบัญชีไม่ตรงกับบัญชีเป้าหมาย");
    }

    toast(`ตั้งรหัสผ่านชั่วคราวให้ ${account.email} เรียบร้อยแล้ว`);
  } catch (error) {
    toast(error.message);
  }
}

async function deleteMemberAccount(email) {
  const account = findAccount(email);

  if (!account) {
    return toast("ไม่พบบัญชีเป้าหมาย");
  }

  if (
    state.user &&
    String(state.user.email || "").toLowerCase() ===
    String(account.email || "").toLowerCase()
  ) {
    return toast("ไม่สามารถลบบัญชีที่กำลังเข้าสู่ระบบอยู่ได้");
  }

  const roleText =
    account.role === "student"
      ? "นักเรียน"
      : account.role === "teacher"
        ? "ครู"
        : "ผู้ดูแลระบบ";

  const confirmed = confirm(
    `ยืนยันลบบัญชี${roleText}\n${account.email}\n\nการลบไม่สามารถย้อนกลับได้`
  );

  if (!confirmed) return;

  try {
    await api("deleteAccount", {
  targetUserId: account.userId,
  targetEmail: account.email
});

    toast(`ลบบัญชี ${account.email} เรียบร้อยแล้ว`);
    await loadAdmin();
  } catch (error) {
    toast(error.message);
  }
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
