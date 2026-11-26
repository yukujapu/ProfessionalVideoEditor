const $ = (id) => document.getElementById(id);
const screens = ["projectsScreen", "createScreen", "editorScreen"];
let projects = [];
let currentProject = null;
let selectedRatio = "16:9";
let trackCount = 1;
let media = [];

function loadProjects() {
  try { projects = JSON.parse(localStorage.getItem("pve_projects") || "[]"); }
  catch { projects = []; }
  renderProjects();
}
function saveProjects() {
  localStorage.setItem("pve_projects", JSON.stringify(projects));
  renderProjects();
}
function showScreen(id) {
  screens.forEach(s => $(s).classList.toggle("hidden", s !== id));
}
function renderProjects() {
  const query = ($("projectSearch")?.value || "").toLowerCase();
  const list = $("projectList");
  if (!list) return;
  list.innerHTML = "";
  const filtered = projects.filter(p => p.name.toLowerCase().includes(query));
  if (!filtered.length) {
    list.innerHTML = '<div class="empty-timeline">プロジェクトはまだありません。「新規作成」から始めましょう。</div>';
    return;
  }
  filtered.forEach(p => {
    const card = document.createElement("article");
    card.className = "project-card";
    const date = new Date(p.updatedAt).toLocaleString("ja-JP");
    card.innerHTML = `<div class="project-thumb">PROJECT</div><div class="project-info"><strong></strong><small>${p.ratio} ・ ${p.resolution}p ・ ${date}</small></div><button class="project-menu" aria-label="メニュー">•••</button>`;
    card.querySelector("strong").textContent = p.name;
    card.querySelector(".project-info").addEventListener("click", () => openProject(p.id));
    card.querySelector(".project-thumb").addEventListener("click", () => openProject(p.id));
    card.querySelector(".project-menu").addEventListener("click", () => projectMenu(p.id));
    list.appendChild(card);
  });
}
function projectMenu(id) {
  const p = projects.find(x => x.id === id);
  if (!p) return;
  const action = prompt("操作を入力してください：rename（名前変更） / duplicate（複製） / delete（削除）");
  if (action === "rename") {
    const name = prompt("新しいプロジェクト名", p.name);
    if (name?.trim()) p.name = name.trim();
  } else if (action === "duplicate") {
    projects.push({...p, id: crypto.randomUUID(), name: p.name + " のコピー", updatedAt: Date.now()});
  } else if (action === "delete" && confirm("このプロジェクトを削除しますか？")) {
    projects = projects.filter(x => x.id !== id);
  }
  saveProjects();
}
$("newProjectBtn").addEventListener("click", () => showScreen("createScreen"));
document.querySelectorAll("[data-back]").forEach(b => b.addEventListener("click", () => showScreen("projectsScreen")));
document.querySelectorAll(".ratio").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll(".ratio").forEach(x => x.classList.remove("selected"));
  b.classList.add("selected"); selectedRatio = b.dataset.ratio;
}));
$("createProjectBtn").addEventListener("click", () => {
  const p = {id: crypto.randomUUID(), name: $("projectName").value.trim() || "新しいプロジェクト", ratio: selectedRatio, resolution: $("resolution").value, updatedAt: Date.now(), media: []};
  projects.push(p); saveProjects(); openProject(p.id);
});
function openProject(id) {
  currentProject = projects.find(p => p.id === id);
  if (!currentProject) return;
  media = currentProject.media || [];
  $("editorProjectName").textContent = currentProject.name;
  $("projectMeta").textContent = `${currentProject.ratio} ・ ${currentProject.resolution}p`;
  $("previewCanvas").style.aspectRatio = currentProject.ratio.replace(":", "/");
  renderMedia(); renderTracks(); showScreen("editorScreen");
}
$("editorBack").addEventListener("click", () => showScreen("projectsScreen"));
$("saveBtn").addEventListener("click", () => {
  if (!currentProject) return;
  currentProject.media = media.map(({name,type,size}) => ({name,type,size}));
  currentProject.updatedAt = Date.now(); saveProjects();
  alert("プロジェクト情報を保存しました。");
});
$("projectSearch").addEventListener("input", renderProjects);

function renderTracks() {
  const tracks = $("tracks"); tracks.innerHTML = "";
  if (!media.length) { tracks.innerHTML = '<div class="empty-timeline">素材を追加すると、ここにクリップが表示されます。</div>'; return; }
  for (let i = 0; i < trackCount; i++) {
    const row = document.createElement("div"); row.className = "track";
    const name = document.createElement("span"); name.className = "track-name"; name.textContent = `トラック ${i+1}`; row.appendChild(name);
    media.filter((m, idx) => idx % trackCount === i).forEach(m => {
      const clip = document.createElement("div"); clip.className = "clip " + (m.type === "audio" ? "audio" : m.type === "image" ? "image" : "");
      clip.textContent = m.name; clip.title = m.name; row.appendChild(clip);
    });
    tracks.appendChild(row);
  }
}
function renderMedia() {
  const list = $("mediaItems"); list.innerHTML = "";
  media.forEach((m, i) => {
    const item = document.createElement("div"); item.className = "media-item";
    const label = document.createElement("span"); label.textContent = `${m.type === "video" ? "動画" : m.type === "image" ? "写真" : "音声"}：${m.name}`;
    const add = document.createElement("button"); add.textContent = "タイムラインへ"; add.addEventListener("click", () => { renderTracks(); alert("素材をタイムラインに配置しました（初期版では仮配置です）。"); });
    item.append(label, add); list.appendChild(item);
  });
}
function addFiles(files, type) {
  Array.from(files).forEach(f => media.push({name:f.name, type, size:f.size}));
  renderMedia(); renderTracks();
}
$("addVideoBtn").addEventListener("click", () => $("videoInput").click());
$("addPhotoBtn").addEventListener("click", () => $("photoInput").click());
$("addAudioBtn").addEventListener("click", () => $("audioInput").click());
$("videoInput").addEventListener("change", e => addFiles(e.target.files, "video"));
$("photoInput").addEventListener("change", e => addFiles(e.target.files, "image"));
$("audioInput").addEventListener("change", e => addFiles(e.target.files, "audio"));
$("addTrackBtn").addEventListener("click", () => { trackCount++; renderTracks(); });
$("zoomInBtn").addEventListener("click", () => alert("タイムライン拡大機能は次の開発段階で実装します。"));
$("zoomOutBtn").addEventListener("click", () => alert("タイムライン縮小機能は次の開発段階で実装します。"));
$("fitPreviewBtn").addEventListener("click", () => $("previewCanvas").style.width = "100%");
$("playBtn").addEventListener("click", () => alert("再生エンジンは次の開発段階で実装します。"));

const toolInfo = {
  media: ["メディア", "動画・写真・音声を追加できます。"],
  edit: ["編集", "カット・分割・速度変更などの編集機能を追加予定です。"],
  text: ["テキスト", "字幕・タイトル・文字アニメーション機能を追加予定です。"],
  audio: ["オーディオ", "BGM・効果音・波形編集機能を追加予定です。"],
  effects: ["エフェクト", "映像効果・カラー調整・トランジション機能を追加予定です。"],
  layers: ["レイヤー", "トラックやレイヤーの管理機能を追加予定です。"],
  settings: ["設定", "書き出し・保存・ガイドなどの設定を追加予定です。"]
};
document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  tab.classList.add("active");
  const [title, desc] = toolInfo[tab.dataset.tab];
  $("toolTitle").textContent = title;
  $("toolContent").innerHTML = `<p>${desc}</p>`;
  $("toolPanel").classList.remove("hidden");
}));
$("closeToolPanel").addEventListener("click", () => $("toolPanel").classList.add("hidden"));
$("seekBar").addEventListener("input", e => $("currentTime").textContent = "00:00:" + String(Math.floor(Number(e.target.value) / 5)).padStart(2,"0"));
loadProjects();
