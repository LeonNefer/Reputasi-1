import { getSubject, subjects, avatarOptions } from "./data.js";

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const dateText = (value, options = { day: "numeric", month: "short", year: "numeric" }) => value ? new Intl.DateTimeFormat("id-ID", options).format(new Date(value)) : "—";
const timeText = (value) => value ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "";
const accuracy = (correct, total) => total ? Math.round((correct / total) * 100) : 0;

function pageHeader(kicker, title, subtitle, actions = "") {
  return '<header class="page-header"><div><p class="eyebrow">' + esc(kicker) + '</p><h1>' + title + '</h1><p>' + esc(subtitle) + '</p></div>' +
    (actions ? '<div class="page-header-actions">' + actions + '</div>' : "") + '</header>';
}

function emptyState(icon, title, description, action = "") {
  return '<div class="empty-state"><div class="empty-icon">' + icon + '</div><strong>' + esc(title) + '</strong><p>' + esc(description) + '</p>' + action + '</div>';
}

function noChildState() {
  return '<section class="card">' + emptyState("🌱", "Profil anak belum tersedia", "Tambahkan data anak pada tabel children di Supabase untuk mulai melihat ringkasan belajarnya.", '<a class="button button-secondary" href="customize.html">Buka profil anak</a>') + '</section>';
}

function subjectTile(subjectName, records) {
  const subject = getSubject(subjectName);
  const correct = records.reduce((sum, row) => sum + Number(row.correct_count || 0), 0);
  const total = records.reduce((sum, row) => sum + Number(row.total_questions || 0), 0);
  const percent = accuracy(correct, total);
  return '<article class="subject-card"><div class="subject-top"><div class="subject-symbol">' + subject.icon + '</div><div class="subject-name">' + esc(subject.name) + '</div></div>' +
    '<div class="subject-score"><span>' + records.length + ' sesi · ' + correct + '/' + total + ' benar</span><strong>' + percent + '%</strong></div>' +
    '<div class="progress-track" aria-label="Akurasi ' + percent + '%"><div class="progress-fill" style="width:' + percent + '%"></div></div></article>';
}

function recentSession(session) {
  const subject = getSubject(session.subject);
  return '<div class="recent-item"><div class="recent-mark">' + subject.icon + '</div><div class="recent-content"><strong>' + esc(session.subject) +
    ' <span style="display:inline">· ' + esc(session.difficulty) + '</span></strong><span>' + Number(session.correct_count || 0) + ' dari ' +
    Number(session.total_questions || 0) + ' soal benar · ' + timeText(session.completed_at) + '</span></div><span class="recent-points">+' +
    Number(session.score_points || 0) + '</span></div>';
}

function focusItem(attempt, session) {
  const subject = getSubject(session?.subject);
  return '<div class="focus-item"><strong>' + subject.icon + ' ' + esc(session?.subject || "Latihan") + ' · Soal ' +
    Number(attempt.question_number || 0) + '</strong><span>' + esc(attempt.question_text) + '</span></div>';
}

export function renderDashboard(data) {
  const child = data.child;
  const sessions = data.sessions;
  const attempts = data.attempts;
  if (!child) return pageHeader("RINGKASAN BELAJAR", "Selamat datang", "Pilih profil anak untuk mulai memantau.") + noChildState();
  const total = sessions.reduce((sum, row) => sum + Number(row.total_questions || 0), 0);
  const correct = sessions.reduce((sum, row) => sum + Number(row.correct_count || 0), 0);
  const wrong = sessions.reduce((sum, row) => sum + Number(row.incorrect_count || 0), 0);
  const points = sessions.reduce((sum, row) => sum + Number(row.score_points || 0), 0);
  const sessionsToday = sessions.filter((row) => new Date(row.completed_at).toDateString() === new Date().toDateString()).length;
  const subjectHtml = subjects().map((subject) => subjectTile(subject.name, sessions.filter((row) => row.subject === subject.name))).join("");
  const latest = [...sessions].sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at)).slice(0, 3);
  const sessionsById = Object.fromEntries(sessions.map((row) => [row.id, row]));
  const wrongAttempts = [...attempts].filter((row) => !row.is_correct).slice(0, 2);
  const sessionHtml = latest.length ? latest.map(recentSession).join("") : emptyState("📚", "Belum ada sesi belajar", "Hasil latihan anak akan muncul di sini setelah tersambung ke data belajar.");
  const focusHtml = wrongAttempts.length ? wrongAttempts.map((row) => focusItem(row, sessionsById[row.session_id])).join("") : "<p>Belum ada jawaban yang perlu dibahas. Terus beri semangat untuk usahanya hari ini.</p>";
  const content =
    '<section class="welcome-card"><div class="welcome-avatar" aria-hidden="true">' + esc(child.avatar_key || "🧒🏻") + '</div><div class="welcome-copy"><p class="eyebrow">RUANG TUMBUH HARI INI</p><h2>Halo, ' + esc(child.name) +
    ' 👋</h2><p>' + esc(child.grade || "Si kecil") + ' sedang membangun kebiasaan belajar yang hebat.</p></div><div class="welcome-points"><strong>✦ ' +
    points.toLocaleString("id-ID") + '</strong><span>total poin belajar</span></div></section>' +
    '<section class="stats-grid" aria-label="Statistik belajar">' +
    '<article class="stat-card"><div class="stat-top"><span>Soal dikerjakan</span><span class="stat-icon">✎</span></div><div class="stat-value">' + total + '</div><div class="stat-note">dari ' + sessions.length + ' sesi latihan</div></article>' +
    '<article class="stat-card"><div class="stat-top"><span>Jawaban benar</span><span class="stat-icon">✓</span></div><div class="stat-value">' + accuracy(correct, total) + '%</div><div class="stat-note">' + correct + ' soal dijawab dengan tepat</div></article>' +
    '<article class="stat-card"><div class="stat-top"><span>Perlu dibahas</span><span class="stat-icon">♡</span></div><div class="stat-value">' + wrong + '</div><div class="stat-note">kesempatan belajar bersama</div></article>' +
    '<article class="stat-card"><div class="stat-top"><span>Sesi hari ini</span><span class="stat-icon">☀</span></div><div class="stat-value">' + sessionsToday + '</div><div class="stat-note">latihan yang sudah selesai</div></article></section>' +
    '<div class="dashboard-grid"><div><section class="card card-pad"><div class="section-head"><div><h2 class="section-title">Perkembangan per mata pelajaran</h2><p class="section-subtitle">Akurasi dari semua sesi yang tercatat</p></div><a class="link-button" href="history.html">Lihat riwayat →</a></div>' +
    (sessions.length ? '<div class="subject-grid">' + subjectHtml + '</div>' : emptyState("📘", "Belum ada ringkasan", "Sesi belajar akan ditampilkan setelah data anak terhubung.")) + '</section>' +
    '<section class="focus-card"><div class="section-head"><div><h2 class="section-title">💡 Obrolan kecil untuk hari ini</h2><p class="section-subtitle">Gunakan sebagai awal untuk menjelaskan dengan santai</p></div><a class="link-button" href="history.html">Semua soal</a></div>' + focusHtml + '</section></div>' +
    '<div class="dashboard-right"><section class="card card-pad"><div class="section-head"><div><h2 class="section-title">Aktivitas terbaru</h2><p class="section-subtitle">Perjalanan belajar anak</p></div><a class="link-button" href="history.html">Lihat semua</a></div><div class="recent-list">' + sessionHtml + '</div></section>' +
    '<section class="info-card"><div class="info-illustration">🌿</div><h3>Prosesnya yang utama</h3><p>Rayakan usaha, rasa ingin tahu, dan keberaniannya mencoba lagi. Setiap soal yang keliru memberi kesempatan untuk belajar bersama.</p><ul><li>Tanyakan bagaimana ia berpikir.</li><li>Bahas satu hal kecil dalam satu waktu.</li></ul></section></div></div>';
  return pageHeader("PANTAU PERJALANAN BELAJAR", "Ringkasan belajar", "Lihat kemajuan " + child.name + " dan temukan hal yang bisa dipelajari bersama.",
    '<button class="button button-outline" type="button" data-action="share">↗ <span>Bagikan ringkasan</span></button>') +
    (data.demo ? '<div class="demo-banner"><strong>Pratinjau demo.</strong> Data berikut contoh dan tersimpan hanya di perangkat ini.</div>' : "") + content;
}

function reviewCard(attempt, session) {
  const subject = getSubject(session?.subject);
  const right = Boolean(attempt.is_correct);
  const search = (attempt.question_text + " " + attempt.selected_answer + " " + attempt.correct_answer + " " + (session?.subject || "")).toLowerCase();
  const note = !right ? '<div class="note-area" data-note-area data-attempt-id="' + esc(attempt.id) + '"><div class="note-label"><span>Catatan untuk dibahas bersama</span>' +
    '<button class="link-button" type="button" data-action="toggle-note" data-target="' + esc(attempt.id) + '">' + (attempt.parent_note ? "Ubah catatan" : "+ Tulis catatan") + '</button></div>' +
    '<p class="note-text" data-note-text>' + esc(attempt.parent_note || "") + '</p><div class="note-editor hidden" data-note-editor><textarea aria-label="Catatan orang tua" placeholder="Contoh: Besok kita coba gambar bagian tumbuhan bersama.">' +
    esc(attempt.parent_note || "") + '</textarea><div class="note-actions"><button class="button button-outline button-small" type="button" data-action="cancel-note">Batal</button>' +
    '<button class="button button-primary button-small" type="button" data-action="save-note">Simpan catatan</button></div></div></div>' : "";
  return '<article class="review-card" data-review-card data-is-correct="' + right + '" data-subject="' + esc(session?.subject || "") + '" data-search="' + esc(search) + '">' +
    '<div class="review-top"><div class="review-subject"><span class="subject-symbol">' + subject.icon + '</span><span>' + esc(session?.subject || "Belajar") +
    ' <span style="color:var(--muted);font-weight:500">· ' + esc(session?.difficulty || "") + ' · Soal ' + Number(attempt.question_number || 0) + '</span></span></div>' +
    '<span class="status-pill ' + (right ? "status-correct" : "status-wrong") + '">' + (right ? "✓ Benar" : "↗ Perlu dibahas") + '</span></div>' +
    '<p class="review-question">' + esc(attempt.question_text) + '</p><div class="answer-grid">' +
    '<div class="answer-box ' + (right ? "answer-good" : "answer-bad") + '"><strong>Jawaban anak</strong>' + esc(attempt.selected_answer) + '</div>' +
    '<div class="answer-box answer-good"><strong>Jawaban tepat</strong>' + esc(attempt.correct_answer) + '</div></div>' +
    (!right && attempt.explanation ? '<div class="explanation"><b>Kenapa?</b><span>' + esc(attempt.explanation) + '</span></div>' : "") + note + '</article>';
}

function sessionTable(sessions) {
  if (!sessions.length) return emptyState("📚", "Belum ada riwayat sesi", "Data sesi belajar akan muncul setelah latihan anak tercatat.");
  const rows = sessions.map((row) => '<tr><td><strong>' + esc(row.subject) + '</strong></td><td>' + esc(row.difficulty) + '</td><td>' +
    Number(row.correct_count || 0) + ' dari ' + Number(row.total_questions || 0) + '</td><td class="score-good">+' + Number(row.score_points || 0) + '</td><td>' +
    timeText(row.completed_at) + '</td></tr>').join("");
  return '<div class="session-table-wrap"><table class="session-table"><thead><tr><th>Mata pelajaran</th><th>Tingkat</th><th>Jawaban benar</th><th>Poin</th><th>Waktu</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

export function renderHistory(data) {
  const child = data.child;
  const sessions = data.sessions;
  const attempts = data.attempts;
  if (!child) return pageHeader("JEJAK BELAJAR", "Riwayat belajar", "Lihat jawaban dan sesi latihan.") + noChildState();
  const sessionsById = Object.fromEntries(sessions.map((row) => [row.id, row]));
  const ordered = [...attempts].sort((a, b) => new Date(b.answered_at || 0) - new Date(a.answered_at || 0));
  const wrong = ordered.filter((row) => !row.is_correct).length;
  const cards = ordered.length ? ordered.map((row) => reviewCard(row, sessionsById[row.session_id])).join("") :
    emptyState("🔎", "Belum ada jawaban untuk ditinjau", "Semua jawaban dan penjelasannya akan muncul setelah data latihan tersambung.");
  const chips = '<button class="filter-chip active" type="button" data-filter="all">Semua jawaban</button><button class="filter-chip" type="button" data-filter="wrong">Perlu dibahas (' + wrong + ')</button>' +
    subjects().map((subject) => '<button class="filter-chip" type="button" data-filter="' + esc(subject.name) + '">' + esc(subject.name) + '</button>').join("");
  const content = '<section class="card card-pad"><div class="section-head"><div><h2 class="section-title">Jawaban anak</h2><p class="section-subtitle">' + ordered.length +
    ' jawaban tersedia · ' + wrong + ' jawaban perlu dibahas</p></div></div><div class="history-tools"><label class="search-box"><span aria-hidden="true">⌕</span>' +
    '<input type="search" id="history-search" placeholder="Cari mata pelajaran atau soal" aria-label="Cari jawaban"></label></div>' +
    '<div class="filter-row" role="group" aria-label="Filter jawaban">' + chips + '</div><div class="review-summary"><span id="review-count">Menampilkan ' + ordered.length +
    ' jawaban</span><span>Jawaban terbaru lebih dulu</span></div><div class="review-list" id="review-list">' + cards + '</div></section>' +
    '<section class="card card-pad" style="margin-top:17px"><div class="section-head"><div><h2 class="section-title">Sesi belajar</h2><p class="section-subtitle">Nilai latihan per mata pelajaran dan tingkat</p></div></div>' +
    sessionTable([...sessions].sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))) + '</section>';
  return pageHeader("JEJAK BELAJAR", "Riwayat " + esc(child.name), "Tinjau hasil latihan, pahami jawaban yang keliru, lalu tambahkan catatan untuk obrolan di rumah.") +
    (data.demo ? '<div class="demo-banner"><strong>Pratinjau demo.</strong> Contoh soal dan catatan ini bukan hasil belajar sungguhan.</div>' : "") + content;
}

export function renderCustomize(data) {
  const child = data.child || { name: "", avatar_key: "👧🏽", grade: "Kelas 4" };
  const avatars = avatarOptions().map((avatar) => '<button class="avatar-choice ' + (avatar === child.avatar_key ? "selected" : "") +
    '" type="button" data-avatar="' + esc(avatar) + '" aria-label="Pilih avatar ' + esc(avatar) + '" aria-pressed="' + (avatar === child.avatar_key) + '">' + esc(avatar) + '</button>').join("");
  const grades = ["Kelas 1", "Kelas 2", "Kelas 3", "Kelas 4", "Kelas 5", "Kelas 6"];
  const gradeOptions = grades.map((grade) => '<option value="' + grade + '" ' + (grade === child.grade ? "selected" : "") + '>' + grade + '</option>').join("");
  const content = '<section class="card profile-card"><div class="section-head"><div><h2 class="section-title">' + (data.child ? "Profil dan tampilan" : "Tambahkan profil anak") + '</h2><p class="section-subtitle">Buat ruang belajar terasa lebih dekat dengan anak.</p></div></div>' +
    '<div class="profile-preview"><div class="profile-avatar" id="profile-avatar-preview">' + esc(child.avatar_key || "🧒🏻") + '</div><div><span>Halo,</span><strong id="profile-name-preview">' +
    esc(child.name) + '</strong><span>' + esc(child.grade || "Kelas 4") + '</span></div></div><form class="profile-form" id="child-profile-form">' +
    '<label class="field">Nama panggilan<input name="child-name" type="text" maxlength="30" value="' + esc(child.name) + '" required></label>' +
    '<label class="field">Kelas<select name="child-grade">' + gradeOptions + '</select></label><p class="section-subtitle">Pilih karakter</p>' +
    '<div class="avatar-grid" role="group" aria-label="Pilihan avatar">' + avatars + '</div><div class="profile-form-actions">' +
    '<button class="button button-primary" type="submit">' + (data.child ? "Simpan profil" : "Buat profil anak") + '</button><a class="button button-outline" href="dashboard.html">Kembali</a></div></form></section>';
  return pageHeader("PROFIL ANAK", data.child ? "Kustomisasi karakter" : "Mulai dengan profil anak", "Pilih nama panggilan dan avatar yang membuat anak merasa nyaman.") +
    (data.demo ? '<div class="demo-banner"><strong>Pratinjau demo.</strong> Perubahan tersimpan di browser ini saja.</div>' : "") + content;
}

export function renderSettings(data) {
  const email = data.user?.email || (data.demo ? "demo@ruangtumbuh.id" : "—");
  const displayName = data.user?.user_metadata?.display_name || "Orang tua";
  const dark = document.body.classList.contains("dark");
  const notif = localStorage.getItem("ruang-tumbuh-notifications") !== "off";
  const content = '<div class="settings-grid"><div class="settings-stack"><section class="card settings-card"><div class="section-head"><div><h2 class="section-title">Tampilan dan kenyamanan</h2><p class="section-subtitle">Atur pengalaman saat membuka CoolSmartGames.</p></div></div>' +
    '<div class="setting-row"><div class="setting-copy"><strong>Mode gelap</strong><span>Lebih nyaman untuk ruangan dengan cahaya redup.</span></div><label class="switch setting-control" aria-label="Mode gelap"><input type="checkbox" data-setting="theme" ' + (dark ? "checked" : "") + '><span class="switch-track"></span></label></div>' +
    '<div class="setting-row"><div class="setting-copy"><strong>Pengingat belajar</strong><span>Pengingat lembut untuk melihat kemajuan terbaru.</span></div><label class="switch setting-control" aria-label="Pengingat belajar"><input type="checkbox" data-setting="notifications" ' + (notif ? "checked" : "") + '><span class="switch-track"></span></label></div></section>' +
    '<section class="card settings-card"><div class="section-head"><div><h2 class="section-title">Akun orang tua</h2><p class="section-subtitle">Detail akun yang sedang digunakan.</p></div></div>' +
    '<div class="setting-row"><div class="setting-copy"><strong>Email</strong><span class="account-email">' + esc(email) + '</span></div><span class="status-pill status-correct">Terlindungi</span></div>' +
    '<div class="setting-row"><div class="setting-copy"><strong>Nama akun</strong><span>' + esc(displayName) + '</span></div><span class="account-meta">' + (data.demo ? "Akun pratinjau" : "Supabase Auth") + '</span></div>' +
    '<div class="setting-row"><div class="setting-copy"><strong>Keluar dari akun</strong><span>Akhiri sesi di perangkat ini.</span></div><button class="button button-danger button-small" type="button" data-action="logout">Keluar</button></div></section>' +
    '<section class="card settings-card"><div class="section-head"><div><h2 class="section-title">Tentang CoolSmartGames</h2><p class="section-subtitle">Pendamping belajar untuk keluarga.</p></div></div>' +
    '<p style="margin:0;color:var(--ink-soft);font-size:12px;line-height:1.8">Pantau pelajaran yang sudah dikerjakan, lihat jawaban benar dan keliru, dan simpan catatan kecil untuk dibahas bersama. Data anak hanya ditampilkan kepada akun orang tua yang memilikinya.</p></section></div>' +
    '<aside class="info-card"><div class="info-illustration">🪴</div><h3>Belajar bersama, sedikit demi sedikit.</h3><p>Kesalahan adalah petunjuk tentang hal yang perlu dijelaskan lagi. Gunakan catatan untuk merencanakan obrolan yang hangat dan menyenangkan.</p><ul><li>Tidak perlu membahas semuanya sekaligus.</li><li>Mulai dengan pertanyaan terbuka.</li><li>Apresiasi usaha dan rasa ingin tahu.</li></ul></aside></div>';
  return pageHeader("PREFERENSI", "Pengaturan", "Kelola tampilan, pengingat, dan akun orang tua.") +
    (data.demo ? '<div class="demo-banner"><strong>Pratinjau demo.</strong> Pengaturan tampilan tersimpan di perangkat ini.</div>' : "") + content;
}
