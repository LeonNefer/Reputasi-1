import { getSupabase, isDemoSession, isSupabaseConfigured } from "./supabase.js";

const form = document.querySelector("#auth-form");
const nameField = document.querySelector("#name-field");
const title = document.querySelector("#auth-title");
const eyebrow = document.querySelector("#auth-eyebrow");
const description = document.querySelector("#auth-description");
const submitButton = document.querySelector("#submit-auth");
const switchButton = document.querySelector("#switch-mode");
const modeSwitch = document.querySelector("#mode-switch");
const message = document.querySelector("#auth-message");
const errorBox = document.querySelector("#auth-error");
const demoButton = document.querySelector("#demo-button");
const setupNotice = document.querySelector("#setup-notice");
const emailField = form.querySelector('[name="email"]').closest(".field");
let mode = "login";
const recoveryMode = new URLSearchParams(window.location.search).get("recovery") === "1" || window.location.hash.includes("type=recovery");

if (!isSupabaseConfigured) {
  setupNotice.classList.remove("hidden");
  demoButton.classList.remove("hidden");
}

if (isSupabaseConfigured) {
  try {
    const supabase = await getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (session && !recoveryMode) window.location.replace("dashboard.html");
  } catch {
    showError("Layanan masuk belum dapat dihubungi. Periksa koneksi internet dan konfigurasi Supabase.");
  }
}

if (isDemoSession()) window.location.replace("dashboard.html");
if (recoveryMode) setMode("recovery");

function setMode(nextMode) {
  mode = nextMode;
  const isSignup = mode === "signup";
  const isRecovery = mode === "recovery";
  nameField.classList.toggle("hidden", !isSignup);
  emailField.classList.toggle("hidden", isRecovery);
  title.textContent = isRecovery ? "Buat kata sandi baru." : isSignup ? "Mulai perjalanan baru." : "Senang melihatmu lagi.";
  eyebrow.textContent = isRecovery ? "PEMULIHAN AKUN" : isSignup ? "BUAT AKUN ORANG TUA" : "SELAMAT DATANG KEMBALI";
  description.textContent = isRecovery ? "Pilih kata sandi baru untuk melanjutkan." : isSignup
    ? "Buat akun untuk melihat perkembangan belajar anak."
    : "Masuk untuk melihat perjalanan belajar anak hari ini.";
  submitButton.textContent = isRecovery ? "Simpan kata sandi" : isSignup ? "Buat akun" : "Masuk ke akun";
  switchButton.textContent = isSignup ? "Masuk" : "Daftar";
  modeSwitch.classList.toggle("hidden", isRecovery);
  document.querySelector("#forgot-password").classList.toggle("hidden", isSignup || isRecovery);
  document.querySelector('[name="password"]').autocomplete = isSignup || isRecovery ? "new-password" : "current-password";
  document.querySelector('[name="password"]').placeholder = isRecovery ? "Kata sandi baru" : "Masukkan kata sandi";
  clearNotice();
}

function showError(text) {
  errorBox.textContent = text;
  errorBox.classList.remove("hidden");
}

function clearNotice() {
  errorBox.textContent = "";
  errorBox.classList.add("hidden");
  message.textContent = "";
  message.classList.add("hidden");
}

switchButton.addEventListener("click", () => setMode(mode === "login" ? "signup" : "login"));

document.querySelector("#toggle-password").addEventListener("click", (event) => {
  const input = document.querySelector('[name="password"]');
  const visible = input.type === "password";
  input.type = visible ? "text" : "password";
  event.currentTarget.classList.toggle("is-visible", visible);
  event.currentTarget.setAttribute("aria-pressed", String(visible));
  event.currentTarget.setAttribute("aria-label", visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi");
});

document.querySelector("#forgot-password").addEventListener("click", async () => {
  clearNotice();
  const email = form.elements.email.value.trim();
  if (!email) return showError("Masukkan email akunmu terlebih dahulu.");
  if (!isSupabaseConfigured) return showError("Hubungkan proyek Supabase terlebih dahulu untuk mengirim tautan reset.");
  try {
    const supabase = await getSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: new URL("index.html?recovery=1", window.location.href).href
    });
    if (error) throw error;
    message.textContent = "Jika email terdaftar, tautan untuk mengatur ulang kata sandi akan dikirim.";
    message.classList.remove("hidden");
  } catch (error) {
    showError(error.message || "Tautan reset belum dapat dikirim. Coba lagi.");
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearNotice();
  if (!isSupabaseConfigured) {
    return showError("Akun sungguhan belum aktif. Gunakan pratinjau demo atau isi konfigurasi Supabase.");
  }
  const email = form.elements.email.value.trim();
  const password = form.elements.password.value;
  const displayName = form.elements.name.value.trim();
  if (password.length < 6) return showError("Kata sandi harus berisi minimal 6 karakter.");
  if (mode === "signup" && !displayName) return showError("Isi nama orang tua terlebih dahulu.");

  submitButton.disabled = true;
  submitButton.textContent = mode === "signup" ? "Membuat akun..." : "Memeriksa akun...";
  try {
    const supabase = await getSupabase();
    if (mode === "recovery") {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      window.location.replace("dashboard.html");
      return;
    }
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.replace("dashboard.html");
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } }
    });
    if (error) throw error;
    if (data.session) {
      window.location.replace("dashboard.html");
      return;
    }
    message.textContent = "Akun dibuat. Buka email untuk mengonfirmasi alamatmu, lalu masuk kembali.";
    message.classList.remove("hidden");
    form.reset();
  } catch (error) {
    showError(error.message || "Akun belum dapat diproses. Periksa email dan kata sandi.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = mode === "recovery" ? "Simpan kata sandi" : mode === "signup" ? "Buat akun" : "Masuk ke akun";
  }
});

demoButton.addEventListener("click", () => {
  sessionStorage.setItem("ruang-tumbuh-demo", "true");
  window.location.href = "dashboard.html";
});
