import { getSupabase, isDemoSession } from "./supabase.js";

const SUBJECTS = [
  { name: "Matematika", icon: "🧮" },
  { name: "IPA", icon: "🧪" },
  { name: "Bahasa Indonesia", icon: "📖" },
  { name: "Bahasa Inggris", icon: "🌎" }
];

const AVATARS = ["👦🏻", "👧🏽", "👩🏻‍🦱", "👦🏿", "👧🏻", "🧒🏽", "👧🏿", "👦🏼"];

function daysAgo(days, hour = 15, minute = 10) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function demoChild() {
  const saved = readJson("ruang-tumbuh-demo-child", {});
  return {
    id: "demo-child",
    name: saved.name || "Nadia",
    avatar_key: saved.avatar_key || AVATARS[1],
    grade: saved.grade || "Kelas 4"
  };
}

export function isDemo() {
  return isDemoSession();
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function demoRecords() {
  const sessions = [
    { id: "s-math", subject: "Matematika", difficulty: "Mudah", total_questions: 30, correct_count: 27, incorrect_count: 3, score_points: 598, completed_at: daysAgo(0, 16, 5) },
    { id: "s-ipa", subject: "IPA", difficulty: "Mudah", total_questions: 30, correct_count: 24, incorrect_count: 6, score_points: 512, completed_at: daysAgo(0, 15, 20) },
    { id: "s-indo", subject: "Bahasa Indonesia", difficulty: "Menengah", total_questions: 30, correct_count: 26, incorrect_count: 4, score_points: 560, completed_at: daysAgo(1, 14, 45) },
    { id: "s-english", subject: "Bahasa Inggris", difficulty: "Mudah", total_questions: 30, correct_count: 24, incorrect_count: 6, score_points: 524, completed_at: daysAgo(1, 14, 10) }
  ];
  const attempts = [
    { id: "a-1", session_id: "s-ipa", question_number: 1, question_text: "Bagian tumbuhan yang menyerap air dari tanah adalah …", selected_answer: "Bunga", correct_answer: "Akar", explanation: "Akar berada di dalam tanah dan memiliki rambut akar yang menyerap air serta mineral untuk disalurkan ke bagian tumbuhan lainnya.", is_correct: false, parent_note: "", answered_at: daysAgo(0, 15, 21) },
    { id: "a-2", session_id: "s-ipa", question_number: 4, question_text: "Perubahan air menjadi uap karena panas matahari disebut …", selected_answer: "Mengembun", correct_answer: "Menguap", explanation: "Penguapan terjadi saat air menerima panas dan berubah menjadi gas. Mengembun adalah kebalikannya: gas berubah menjadi titik air.", is_correct: false, parent_note: "", answered_at: daysAgo(0, 15, 24) },
    { id: "a-3", session_id: "s-math", question_number: 8, question_text: "Hasil dari ¾ − ¼ adalah …", selected_answer: "½", correct_answer: "½", explanation: "Penyebutnya sama, jadi kurangi pembilangnya: 3 − 1 = 2. Hasilnya 2/4 yang disederhanakan menjadi 1/2.", is_correct: true, parent_note: "", answered_at: daysAgo(0, 16, 9) },
    { id: "a-4", session_id: "s-indo", question_number: 12, question_text: "Kalimat yang menggunakan tanda tanya dengan benar adalah …", selected_answer: "Kapan kita berangkat.", correct_answer: "Kapan kita berangkat?", explanation: "Kalimat tanya diakhiri tanda tanya (?). Tanda titik dipakai untuk kalimat berita.", is_correct: false, parent_note: "", answered_at: daysAgo(1, 14, 49) },
    { id: "a-5", session_id: "s-english", question_number: 6, question_text: "Choose the correct word: “She ___ to school every day.”", selected_answer: "goes", correct_answer: "goes", explanation: "For he, she, or it in the simple present, most verbs add -s or -es.", is_correct: true, parent_note: "", answered_at: daysAgo(1, 14, 13) }
  ];
  const notes = readJson("ruang-tumbuh-demo-notes", {});
  attempts.forEach((attempt) => { attempt.parent_note = notes[attempt.id] || ""; });
  return { sessions, attempts };
}

export async function loadChildren() {
  if (isDemoSession()) return [demoChild()];
  const supabase = await getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.from("children")
    .select("id,name,avatar_key,grade,created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function loadLearningData(childId) {
  if (!childId) return { sessions: [], attempts: [] };
  if (isDemoSession()) return demoRecords();
  const supabase = await getSupabase();
  if (!supabase) return { sessions: [], attempts: [] };
  const { data: sessions, error: sessionError } = await supabase.from("learning_sessions")
    .select("id,child_id,subject,difficulty,total_questions,correct_count,incorrect_count,score_points,completed_at")
    .eq("child_id", childId)
    .order("completed_at", { ascending: false });
  if (sessionError) throw sessionError;
  if (!sessions?.length) return { sessions: [], attempts: [] };
  const ids = sessions.map((session) => session.id);
  const { data: attempts, error: attemptError } = await supabase.from("question_attempts")
    .select("id,session_id,question_number,question_text,selected_answer,correct_answer,explanation,is_correct,parent_note,answered_at")
    .in("session_id", ids)
    .order("answered_at", { ascending: false });
  if (attemptError) throw attemptError;
  return { sessions, attempts: attempts || [] };
}

export async function saveParentNote(attemptId, note) {
  if (isDemoSession()) {
    const notes = readJson("ruang-tumbuh-demo-notes", {});
    notes[attemptId] = note.trim();
    localStorage.setItem("ruang-tumbuh-demo-notes", JSON.stringify(notes));
    return;
  }
  const supabase = await getSupabase();
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { error } = await supabase.from("question_attempts")
    .update({ parent_note: note.trim() })
    .eq("id", attemptId);
  if (error) throw error;
}

export async function saveChildProfile(childId, profile, parentId) {
  if (isDemoSession()) {
    localStorage.setItem("ruang-tumbuh-demo-child", JSON.stringify(profile));
    return demoChild();
  }
  const supabase = await getSupabase();
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  if (!childId) {
    const { data, error } = await supabase.from("children")
      .insert({ parent_id: parentId, name: profile.name, avatar_key: profile.avatar_key, grade: profile.grade })
      .select("id,name,avatar_key,grade")
      .single();
    if (error) throw error;
    return data;
  }
  const { error } = await supabase.from("children")
    .update({ name: profile.name, avatar_key: profile.avatar_key, grade: profile.grade })
    .eq("id", childId);
  if (error) throw error;
  return { id: childId, ...profile };
}

export function subjects() {
  return SUBJECTS;
}

export function avatarOptions() {
  return AVATARS;
}

export function getSubject(subjectName) {
  return SUBJECTS.find((subject) => subject.name === subjectName) || { name: subjectName || "Belajar", icon: "✨" };
}
