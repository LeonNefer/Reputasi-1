import { getSupabase, isDemoSession, isSupabaseConfigured } from "./supabase.js";
import { loadChildren, loadLearningData, saveChildProfile, saveParentNote, isDemo } from "./data.js";
import { renderDashboard, renderHistory, renderCustomize, renderSettings } from "./views.js";

const page = document.body.dataset.page || "dashboard";
const viewMap = { dashboard: renderDashboard, history: renderHistory, customize: renderCustomize, settings: renderSettings };
const pageTitles = {
  dashboard: ["Ringkasan belajar", "Lihat perkembangan dan aktivitas belajar anak."],
  history: ["Riwayat belajar", "Tinjau jawaban, sesi, dan catatan belajar."],
  customize: ["Kustomisasi karakter", "Atur profil anak agar terasa lebih personal."],
  settings: ["Pengaturan", "Atur tampilan, pengingat, dan akun."]
};
const navItems = [
  { page: "dashboard", href: "dashboard.html", label: "Ringkasan", icon: "home" },
  { page: "history", href: "history.html", label: "Riwayat belajar", icon: "history" },
  { page: "customize", href: "customize.html", label: "Karakter anak", icon: "person" },
  { page: "settings", href: "settings.html", label: "Pengaturan", icon: "settings" }
];
let context;
let currentFilter = "all";

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function icon(name) {
  const paths = {
    home: '<path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-6h6v6"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1a2 2 0 0 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4v.2a2 2 0 0 1-4 0v-.2A2 2 0 0 0 5.8 18l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1A2 2 0 0 0 1.6 12H1.5a2 2 0 0 1 0-4h.2A2 2 0 0 0 3 4.6l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1A2 2 0 0 0 9.2.4V.3a2 2 0 0 1 4 0v.2A2 2 0 0 0 16.6 2l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a2 2 0 0 0 1.4 3.4h.2a2 2 0 0 1 0 4h-.2a2 2 0 0 0-1.4 2.8Z"/>'
  };
  return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (paths[name] || "") + "</svg>";
}

function applyTheme() {
  document.body.classList.toggle("dark", localStorage.getItem("ruang-tumbuh-theme") === "dark");
}

function sidebarMarkup() {
  const parentName = context.user?.user_metadata?.display_name || "Orang tua";
  const childAvatar = context.child?.avatar_key || "👩🏻‍💼";
  const links = navItems.map((item) => '<a class="nav-link ' + (page === item.page ? "active" : "") + '" href="' + item.href + '"' +
    (page === item.page ? ' aria-current="page"' : "") + '>' + icon(item.icon) + '<span>' + item.label + '</span></a>').join("");
  return '<aside class="sidebar" id="sidebar"><a class="brand" href="dashboard.html"><img class="brand-logo" src="assets/coolsmartgames-logo.png" alt=""> CoolSmartGames</a>' +
    '<nav class="sidebar-nav" aria-label="Menu utama"><p class="nav-label">MENU</p>' + links + '</nav><div class="sidebar-spacer"></div>' +
    '<div class="sidebar-help"><span class="help-icon">♡</span><strong>Belajar dengan nyaman</strong><p>Lihat soal yang bisa jadi bahan obrolan kecil bersama anak.</p><a href="history.html">Buka catatan belajar →</a></div>' +
    '<div class="sidebar-footer"><span class="mini-avatar">' + esc(childAvatar) + '</span><div class="sidebar-user"><strong>' + esc(parentName) + '</strong><span>Orang tua</span></div>' +
    '<button class="sidebar-logout" type="button" data-action="logout" aria-label="Keluar dari akun" title="Keluar">↪</button></div></aside>';
}

function topbarMarkup() {
  const parentName = context.user?.user_metadata?.display_name || "Orang tua";
  const date = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const childOption = context.children.length
    ? context.children.map((child) => '<option value="' + esc(child.id) + '" ' + (context.child?.id === child.id ? "selected" : "") + '>' + esc(child.name) + '</option>').join("")
    : '<option value="">Belum ada profil</option>';
  const picker = context.children.length
    ? '<select class="child-picker" id="child-picker" aria-label="Pilih profil anak">' + childOption + '</select>'
    : '<a class="button button-secondary button-small" href="customize.html">+ Tambah anak</a>';
  return '<header class="topbar"><div class="topbar-left"><button class="menu-toggle" type="button" aria-label="Buka menu">☰</button>' +
    '<span class="topbar-date">' + date + '</span><div class="child-picker-wrap"><span class="child-picker-label">Memantau</span>' + picker +
    '</div></div><div class="topbar-profile"><span class="mini-avatar">👩🏻‍💼</span><span class="topbar-profile-name">' + esc(parentName) +
    '<small>Akun orang tua</small></span></div></header>';
}

function renderShell() {
  document.querySelector("#sidebar-mount").innerHTML = sidebarMarkup();
  document.querySelector("#topbar-mount").innerHTML = topbarMarkup();
  const titleInfo = pageTitles[page] || pageTitles.dashboard;
  document.title = titleInfo[0] + " · CoolSmartGames";
  document.querySelector("#page-mount").innerHTML = (viewMap[page] || renderDashboard)(context);
  bindShellActions();
  bindPageActions();
}

function toast(message) {
  const node = document.querySelector("#toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove("show"), 3000);
}

function showError(error) {
  console.error(error);
  toast(error?.message || "Ada kendala. Coba lagi sebentar.");
}

async function fetchContext(user) {
  const children = await loadChildren();
  const requestedId = localStorage.getItem("ruang-tumbuh-selected-child");
  let child = children.find((entry) => entry.id === requestedId) || children[0] || null;
  if (child) localStorage.setItem("ruang-tumbuh-selected-child", child.id);
  const learning = await loadLearningData(child?.id);
  return { user, children, child, sessions: learning.sessions, attempts: learning.attempts, demo: isDemo() };
}

async function refreshContext() {
  context = await fetchContext(context.user);
  renderShell();
}

async function logout() {
  try {
    if (isDemoSession()) {
      sessionStorage.removeItem("ruang-tumbuh-demo");
    } else {
      const supabase = await getSupabase();
      if (supabase) {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
    }
    window.location.replace("index.html");
  } catch (error) {
    showError(error);
  }
}

function bindShellActions() {
  const toggle = document.querySelector(".menu-toggle");
  if (toggle) toggle.addEventListener("click", () => document.body.classList.toggle("drawer-open"));
  let overlay = document.querySelector(".drawer-overlay");
  if (!overlay) {
    overlay = document.createElement("button");
    overlay.className = "drawer-overlay";
    overlay.type = "button";
    overlay.setAttribute("aria-label", "Tutup menu");
    document.body.appendChild(overlay);
  }
  overlay.onclick = () => document.body.classList.remove("drawer-open");
  document.querySelectorAll(".sidebar .nav-link").forEach((link) => link.addEventListener("click", () => document.body.classList.remove("drawer-open")));
  document.querySelectorAll('[data-action="logout"]').forEach((button) => button.addEventListener("click", logout));
  const picker = document.querySelector("#child-picker");
  if (picker) picker.addEventListener("change", async () => {
    localStorage.setItem("ruang-tumbuh-selected-child", picker.value);
    try { await refreshContext(); } catch (error) { showError(error); }
  });
}

function bindFilters() {
  const cards = [...document.querySelectorAll("[data-review-card]")];
  const searchBox = document.querySelector("#history-search");
  const chips = [...document.querySelectorAll("[data-filter]")];
  const count = document.querySelector("#review-count");
  const apply = () => {
    const query = searchBox?.value.trim().toLowerCase() || "";
    let visible = 0;
    cards.forEach((card) => {
      const subjectMatches = currentFilter === "all" || currentFilter === "wrong"
        ? true
        : card.dataset.subject === currentFilter;
      const wrongMatches = currentFilter !== "wrong" || card.dataset.isCorrect !== "true";
      const searchMatches = !query || card.dataset.search.includes(query);
      const show = subjectMatches && wrongMatches && searchMatches;
      card.classList.toggle("hidden", !show);
      if (show) visible += 1;
    });
    if (count) count.textContent = "Menampilkan " + visible + " jawaban";
  };
  chips.forEach((chip) => chip.addEventListener("click", () => {
    currentFilter = chip.dataset.filter;
    chips.forEach((item) => item.classList.toggle("active", item === chip));
    apply();
  }));
  if (searchBox) searchBox.addEventListener("input", apply);
}

function bindPageActions() {
  bindFilters();
  document.querySelectorAll('[data-action="share"]').forEach((button) => button.addEventListener("click", async () => {
    const name = context.child?.name || "anak";
    const total = context.sessions.reduce((sum, row) => sum + Number(row.total_questions || 0), 0);
    const correct = context.sessions.reduce((sum, row) => sum + Number(row.correct_count || 0), 0);
    const summary = "Ringkasan belajar " + name + ": " + total + " soal dikerjakan, " + correct + " jawaban benar, dari " + context.sessions.length + " sesi. — CoolSmartGames";
    try {
      if (navigator.share) await navigator.share({ title: "Ringkasan belajar", text: summary });
      else {
        await navigator.clipboard.writeText(summary);
        toast("Ringkasan disalin. Siap dibagikan.");
      }
    } catch (error) {
      if (error.name !== "AbortError") showError(error);
    }
  }));

  document.querySelectorAll('[data-action="toggle-note"]').forEach((button) => button.addEventListener("click", () => {
    const area = [...document.querySelectorAll("[data-note-area]")].find((item) => item.dataset.attemptId === button.dataset.target);
    if (!area) return;
    area.querySelector("[data-note-editor]").classList.remove("hidden");
    area.querySelector("[data-note-text]").classList.add("hidden");
    area.querySelector('[data-action="toggle-note"]').classList.add("hidden");
    area.querySelector("textarea").focus();
  }));
  document.querySelectorAll('[data-action="cancel-note"]').forEach((button) => button.addEventListener("click", () => {
    const area = button.closest("[data-note-area]");
    area.querySelector("[data-note-editor]").classList.add("hidden");
    area.querySelector("[data-note-text]").classList.remove("hidden");
    area.querySelector('[data-action="toggle-note"]').classList.remove("hidden");
  }));
  document.querySelectorAll('[data-action="save-note"]').forEach((button) => button.addEventListener("click", async () => {
    const area = button.closest("[data-note-area]");
    const note = area.querySelector("textarea").value;
    button.disabled = true;
    try {
      await saveParentNote(area.dataset.attemptId, note);
      const display = area.querySelector("[data-note-text]");
      display.textContent = note.trim();
      display.classList.toggle("hidden", !note.trim());
      area.querySelector("[data-note-editor]").classList.add("hidden");
      const toggle = area.querySelector('[data-action="toggle-note"]');
      toggle.classList.remove("hidden");
      toggle.textContent = note.trim() ? "Ubah catatan" : "+ Tulis catatan";
      toast("Catatan tersimpan.");
    } catch (error) {
      showError(error);
    } finally {
      button.disabled = false;
    }
  }));

  const form = document.querySelector("#child-profile-form");
  if (form) {
    const avatarPreview = document.querySelector("#profile-avatar-preview");
    const namePreview = document.querySelector("#profile-name-preview");
    const nameInput = form.elements["child-name"];
    let selectedAvatar = document.querySelector(".avatar-choice.selected")?.dataset.avatar || "👧🏽";
    document.querySelectorAll("[data-avatar]").forEach((button) => button.addEventListener("click", () => {
      selectedAvatar = button.dataset.avatar;
      document.querySelectorAll("[data-avatar]").forEach((item) => {
        item.classList.toggle("selected", item === button);
        item.setAttribute("aria-pressed", String(item === button));
      });
      avatarPreview.textContent = selectedAvatar;
    }));
    nameInput.addEventListener("input", () => { namePreview.textContent = nameInput.value || "Anak"; });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const profile = { name: nameInput.value.trim(), avatar_key: selectedAvatar, grade: form.elements["child-grade"].value };
      if (!profile.name) return toast("Isi nama panggilan terlebih dahulu.");
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      try {
        const saved = await saveChildProfile(context.child?.id || null, profile, context.user?.id);
        if (saved?.id) localStorage.setItem("ruang-tumbuh-selected-child", saved.id);
        await refreshContext();
        toast("Profil anak tersimpan.");
      } catch (error) {
        showError(error);
      } finally {
        submit.disabled = false;
      }
    });
  }

  document.querySelectorAll('[data-setting="theme"]').forEach((toggle) => toggle.addEventListener("change", () => {
    localStorage.setItem("ruang-tumbuh-theme", toggle.checked ? "dark" : "light");
    document.body.classList.toggle("dark", toggle.checked);
    toast(toggle.checked ? "Mode gelap diaktifkan." : "Mode terang diaktifkan.");
  }));
  document.querySelectorAll('[data-setting="notifications"]').forEach((toggle) => toggle.addEventListener("change", () => {
    localStorage.setItem("ruang-tumbuh-notifications", toggle.checked ? "on" : "off");
    toast(toggle.checked ? "Pengingat belajar diaktifkan." : "Pengingat belajar dinonaktifkan.");
  }));
}

async function start() {
  applyTheme();
  let user = null;
  if (isDemoSession()) {
    user = { id: "demo-parent", email: "demo@ruangtumbuh.id", user_metadata: { display_name: "Orang tua" } };
  } else {
    if (!isSupabaseConfigured) {
      window.location.replace("index.html");
      return;
    }
    const supabase = await getSupabase();
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!session) {
      window.location.replace("index.html");
      return;
    }
    user = session.user;
    supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") window.location.replace("index.html");
    });
  }
  context = await fetchContext(user);
  renderShell();
}

start().catch((error) => {
  console.error(error);
  document.querySelector("#page-mount").innerHTML = '<section class="card card-pad"><p class="eyebrow">BELUM DAPAT MEMUAT DATA</p><h1 class="serif">Ada sedikit kendala.</h1><p style="color:var(--ink-soft);font-size:13px">Periksa konfigurasi Supabase dan kebijakan database, lalu muat ulang halaman ini.</p><button class="button button-primary" onclick="location.reload()">Coba lagi</button></section>';
});
