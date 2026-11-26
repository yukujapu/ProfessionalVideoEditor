// メディア読み込み・タイムライン配置の初期機能
const $ = id => document.getElementById(id);
const screens = ["projectsScreen", "createScreen", "editorScreen"];
let projects = [], currentProject = null, selectedRatio = "16:9";
let media = [], clips = [], trackCount = 1, selectedClipId = null;

function id() {
  return crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now() + Math.random();
}
function showScreen(name) {
  screens.forEach(x => $(x).classList.toggle("hidden", x !== name));
}
function saveProjects() {
  try {
    localStorage.setItem("pve_projects", JSON.stringify(projects));
    renderProjects();
  } catch {
    alert("保存できませんでした。");
  }
}
function loadProjects() {
  try { projects = JSON.parse(localStorage.getItem("pve_projects") || "[]"); }
  catch { projects = []; }
  renderProjects();
}
function renderProjects() {
  const list = $("projectList");
  if (!list) return;
  list.innerHTML = "";
  const q = ($("projectSearch").value || "").toLowerCase();
  const found = projects.filter(p => p.name.toLowerCase().includes(q));
  if (!found.length) {
    list.innerHTML = '<div class="empty-timeline">プロジェクトはまだありません。「新規作成」から始めましょう。</div>';
    return;
  }
  found.forEach(p => {
    const card = document.createElement("article");
    card.className = "project-card";
    const thumb = document.createElement("div");
    thumb.className = "project-thumb";
    thumb.textContent = "PROJECT";
    const info = document.createElement("div");
    info.className = "project-info";
    const name = document.createElement("strong");
    name.textContent = p.name;
    const small = document.createElement("small");
    small.textContent = `${p.ratio} ・ ${p.resolution}p ・ ${new Date(p.updatedAt).toLocaleString("ja-JP")}`;
    info.append(name, small);
    const open = () => openProject(p.id);
    thumb.addEventListener("click", open);
    info.addEventListener("click", open);
    const menu = document.createElement("button");
    menu.className = "project-menu";
    menu.textContent = "•••";
    menu.addEventListener("click", () => {
      const action = prompt("rename（名前変更） / duplicate（複製） / delete（削除）");
      if (action === "rename") {
        const n = prompt("新しい名前", p.name);
        if (n && n.trim()) p.name = n.trim();
      } else if (action === "duplicate") {
        projects.push({...p, id: id(), name: p.name + " のコピー", updatedAt: Date.now()});
      } else if (action === "delete" && confirm("削除しますか？")) {
        projects = projects.filter(x => x.id !== p.id);
      }
      saveProjects();
    });
    card.append(thumb, info, menu);
    list.appendChild(card);
  });
}
$("newProjectBtn").addEventListener("click", () => showScreen("createScreen"));
document.querySelectorAll("[data-back]").forEach(b => b.addEventListener("click", () => showScreen("projectsScreen")));
document.querySelectorAll(".ratio").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll(".ratio").forEach(x => x.classList.remove("selected"));
  b.classList.add("selected");
  selectedRatio = b.dataset.ratio;
}));
$("createProjectBtn").addEventListener("click", () => {
  const p = {id:id(), name:$("projectName").value.trim() || "新しいプロジェクト",
    ratio:selectedRatio, resolution:$("resolution").value, updatedAt:Date.now()};
  projects.push(p); saveProjects(); openProject(p.id);
});
function openProject(projectId) {
  currentProject = projects.find(p => p.id === projectId);
  if (!currentProject) return;
  media = []; clips = []; trackCount = 1; selectedClipId = null;
  $("editorProjectName").textContent = currentProject.name;
  $("projectMeta").textContent = `${currentProject.ratio} ・ ${currentProject.resolution}p`;
  $("previewCanvas").style.aspectRatio = currentProject.ratio.replace(":", " / ");
  $("previewCanvas").innerHTML = "<span>プレビュー</span>";
  renderMedia(); renderTracks(); showScreen("editorScreen");
}
$("editorBack").addEventListener("click", () => showScreen("projectsScreen"));
$("saveBtn").addEventListener("click", () => {
  if (!currentProject) return;
  currentProject.updatedAt = Date.now();
  saveProjects();
  alert("プロジェクト情報を保存しました。素材ファイル本体の保存は次の段階で追加します。");
});
$("projectSearch").addEventListener("input", renderProjects);

function addFiles(files, type) {
  Array.from(files).forEach(file => {
    media.push({id:id(), name:file.name, type, file, url:URL.createObjectURL(file)});
  });
  renderMedia();
}
function renderMedia() {
  const list = $("mediaItems");
  if (!list) return;
  list.innerHTML = "";
  if (!media.length) {
    const p = document.createElement("p");
    p.textContent = "まだ素材がありません。動画・写真・音声を追加してください。";
    list.appendChild(p);
    return;
  }
  media.forEach(item => {
    const row = document.createElement("div");
    row.className = "media-item";
    const label = document.createElement("span");
    label.textContent = `${item.type === "video" ? "動画" : item.type === "image" ? "写真" : "音声"}：${item.name}`;
    const button = document.createElement("button");
    button.textContent = "タイムラインへ";
    button.addEventListener("click", () => {
      const clip = {id:id(), mediaId:item.id, name:item.name, type:item.type, track:0};
      clips.push(clip); selectedClipId = clip.id;
      renderTracks(); showPreview(item);
    });
    row.append(label, button);
    list.appendChild(row);
  });
}
function renderTracks() {
  const area = $("tracks");
  area.innerHTML = "";
  if (!clips.length) {
    area.innerHTML = '<div class="empty-timeline">素材から「タイムラインへ」を押すと、ここに配置されます。</div>';
    return;
  }
  for (let i = 0; i < trackCount; i++) {
    const row = document.createElement("div");
    row.className = "track";
    const label = document.createElement("span");
    label.className = "track-name";
    label.textContent = `トラック ${i+1}`;
    row.appendChild(label);
    clips.filter(c => c.track === i).forEach(c => {
      const button = document.createElement("button");
      button.className = "clip" + (c.type === "audio" ? " audio" : c.type === "image" ? " image" : "");
      button.textContent = c.name;
      button.style.border = c.id === selectedClipId ? "2px solid #435ee8" : "";
      button.addEventListener("click", () => {
        selectedClipId = c.id;
        const item = media.find(m => m.id === c.mediaId);
        if (item) showPreview(item);
        renderTracks();
      });
      row.appendChild(button);
    });
    area.appendChild(row);
  }
}
function showPreview(item) {
  const canvas = $("previewCanvas");
  canvas.innerHTML = "";
  let element;
  if (item.type === "video") {
    element = document.createElement("video");
    element.controls = true; element.playsInline = true;
    element.preload = "metadata";
  } else if (item.type === "image") {
    element = document.createElement("img");
    element.alt = item.name;
  } else {
    element = document.createElement("audio");
    element.controls = true;
  }
  element.src = item.url;
  element.style.maxWidth = "100%";
  element.style.maxHeight = "100%";
  element.style.objectFit = "contain";
  canvas.appendChild(element);
}
$("addVideoBtn").addEventListener("click", () => $("videoInput").click());
$("addPhotoBtn").addEventListener("click", () => $("photoInput").click());
$("addAudioBtn").addEventListener("click", () => $("audioInput").click());
$("videoInput").addEventListener("change", e => { addFiles(e.target.files, "video"); e.target.value = ""; });
$("photoInput").addEventListener("change", e => { addFiles(e.target.files, "image"); e.target.value = ""; });
$("audioInput").addEventListener("change", e => { addFiles(e.target.files, "audio"); e.target.value = ""; });
$("addTrackBtn").addEventListener("click", () => { trackCount++; renderTracks(); });
$("zoomInBtn").addEventListener("click", () => alert("タイムライン拡大は次の段階で実装します。"));
$("zoomOutBtn").addEventListener("click", () => alert("タイムライン縮小は次の段階で実装します。"));
$("fitPreviewBtn").addEventListener("click", () => {
  $("previewCanvas").style.width = "";
  $("previewCanvas").style.height = "";
});
$("playBtn").addEventListener("click", () => {
  const player = $("previewCanvas").querySelector("video, audio");
  if (!player) return alert("先に動画または音声をプレビューに読み込んでください。");
  if (player.paused) player.play().catch(() => alert("再生できませんでした。"));
  else player.pause();
});

const toolInfo = {
  media:["メディア","動画・写真・音声を追加し、タイムラインへ配置できます。"],
  edit:["編集","カット・分割・速度変更などを追加予定です。"],
  text:["テキスト","字幕・タイトル・文字アニメーションを追加予定です。"],
  audio:["オーディオ","BGM・効果音・波形編集を追加予定です。"],
  effects:["エフェクト","映像効果・カラー調整を追加予定です。"],
  layers:["レイヤー","トラックやレイヤー管理を追加予定です。"],
  settings:["設定","書き出し・保存・ガイド設定を追加予定です."]
};
document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  tab.classList.add("active");
  const [title, description] = toolInfo[tab.dataset.tab];
  $("toolTitle").textContent = title;
  $("toolContent").innerHTML = "";
  const p = document.createElement("p"); p.textContent = description;
  $("toolContent").appendChild(p);
  if (tab.dataset.tab === "media") {
    const buttons = document.createElement("div");
    buttons.className = "media-buttons";
    buttons.innerHTML = '<button id="addVideoBtn">動画を追加</button><button id="addPhotoBtn">写真を追加</button><button id="addAudioBtn">音声を追加</button>';
    const items = document.createElement("div"); items.id = "mediaItems"; items.className = "media-items";
    $("toolContent").append(buttons, items);
    $("addVideoBtn").addEventListener("click", () => $("videoInput").click());
    $("addPhotoBtn").addEventListener("click", () => $("photoInput").click());
    $("addAudioBtn").addEventListener("click", () => $("audioInput").click());
    renderMedia();
  }
  $("toolPanel").classList.remove("hidden");
}));
$("closeToolPanel").addEventListener("click", () => $("toolPanel").classList.add("hidden"));
loadProjects();
