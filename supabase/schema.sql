-- CoolSmartGames parent dashboard.
-- Learning results are read-only to parent clients. A trusted learning-game
-- backend should write session and answer rows with its server-side credentials.

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 30),
  avatar_key text not null default '👧🏽',
  grade text not null default 'Kelas 4',
  created_at timestamptz not null default now()
);

create table if not exists public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  subject text not null check (subject in ('Matematika', 'IPA', 'Bahasa Indonesia', 'Bahasa Inggris')),
  difficulty text not null check (difficulty in ('Mudah', 'Menengah', 'Sulit')),
  total_questions integer not null check (total_questions > 0),
  correct_count integer not null check (correct_count between 0 and total_questions),
  incorrect_count integer not null check (incorrect_count between 0 and total_questions),
  score_points integer not null default 0 check (score_points >= 0),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint learning_sessions_answer_counts_check
    check (correct_count + incorrect_count = total_questions)
);

create table if not exists public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.learning_sessions(id) on delete cascade,
  question_number integer not null check (question_number > 0),
  question_text text not null,
  choices jsonb not null default '[]'::jsonb,
  selected_answer text not null,
  correct_answer text not null,
  explanation text,
  is_correct boolean not null,
  parent_note text not null default '',
  answered_at timestamptz not null default now(),
  unique (session_id, question_number)
);

create index if not exists children_parent_id_idx
  on public.children(parent_id);
create index if not exists learning_sessions_child_completed_idx
  on public.learning_sessions(child_id, completed_at desc);
create index if not exists question_attempts_session_answered_idx
  on public.question_attempts(session_id, answered_at desc);

alter table public.children enable row level security;
alter table public.learning_sessions enable row level security;
alter table public.question_attempts enable row level security;

-- Remove inherited broad table grants, then grant only the operations below.
revoke all on table public.children, public.learning_sessions, public.question_attempts
  from anon, authenticated, public;
grant select, insert, update (name, avatar_key, grade) on public.children to authenticated;
grant select on public.learning_sessions to authenticated;
grant select on public.question_attempts to authenticated;
grant update (parent_note) on public.question_attempts to authenticated;

drop policy if exists "Parents can read their children" on public.children;
create policy "Parents can read their children"
  on public.children for select to authenticated
  using ((select auth.uid()) = parent_id);

drop policy if exists "Parents can add their children" on public.children;
create policy "Parents can add their children"
  on public.children for insert to authenticated
  with check ((select auth.uid()) = parent_id);

drop policy if exists "Parents can update their children" on public.children;
create policy "Parents can update their children"
  on public.children for update to authenticated
  using ((select auth.uid()) = parent_id)
  with check ((select auth.uid()) = parent_id);

drop policy if exists "Parents can read their learning sessions" on public.learning_sessions;
create policy "Parents can read their learning sessions"
  on public.learning_sessions for select to authenticated
  using (
    exists (
      select 1
      from public.children c
      where c.id = learning_sessions.child_id
        and c.parent_id = (select auth.uid())
    )
  );

drop policy if exists "Parents can read their question attempts" on public.question_attempts;
create policy "Parents can read their question attempts"
  on public.question_attempts for select to authenticated
  using (
    exists (
      select 1
      from public.learning_sessions s
      join public.children c on c.id = s.child_id
      where s.id = question_attempts.session_id
        and c.parent_id = (select auth.uid())
    )
  );

drop policy if exists "Parents can update notes on their question attempts" on public.question_attempts;
create policy "Parents can update notes on their question attempts"
  on public.question_attempts for update to authenticated
  using (
    exists (
      select 1
      from public.learning_sessions s
      join public.children c on c.id = s.child_id
      where s.id = question_attempts.session_id
        and c.parent_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.learning_sessions s
      join public.children c on c.id = s.child_id
      where s.id = question_attempts.session_id
        and c.parent_id = (select auth.uid())
    )
  );
