-- Lessons feature: lessons, lesson_quiz_questions, lesson_completions

CREATE TABLE lessons (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title              text        NOT NULL,
  slug               text        UNIQUE NOT NULL,
  description        text,
  content_mdx        text        NOT NULL DEFAULT '',
  language_framework jsonb,
  role_tags          text[]      NOT NULL DEFAULT '{}',
  industry_tags      text[]      NOT NULL DEFAULT '{}',
  scenario_id        uuid        REFERENCES scenarios(id) ON DELETE SET NULL,
  order_index        integer     NOT NULL DEFAULT 0,
  is_published       boolean     NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lesson_quiz_questions (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id      uuid    NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  question       text    NOT NULL,
  correct_answer text    NOT NULL,
  distractors    text[]  NOT NULL DEFAULT '{}',
  order_index    integer NOT NULL DEFAULT 0
);

CREATE TABLE lesson_completions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id        uuid        NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  quiz_score       integer,
  quiz_passed      boolean     NOT NULL DEFAULT false,
  scenario_unlocked boolean    NOT NULL DEFAULT false,
  completed_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE lessons              ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_completions   ENABLE ROW LEVEL SECURITY;

-- lessons: all authenticated users can read published lessons
CREATE POLICY "published lessons readable by all"
  ON lessons FOR SELECT
  USING (is_published = true);

-- lessons: admins can read all (including unpublished)
CREATE POLICY "admins read all lessons"
  ON lessons FOR SELECT
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- lesson_quiz_questions: readable if the lesson is published
CREATE POLICY "quiz questions readable for published lessons"
  ON lesson_quiz_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = lesson_quiz_questions.lesson_id
        AND lessons.is_published = true
    )
  );

-- lesson_completions: users manage their own rows
CREATE POLICY "users manage own completions"
  ON lesson_completions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- lesson_completions: managers/admins read all completions for their tenant
CREATE POLICY "managers read tenant completions"
  ON lesson_completions FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('manager', 'admin')
    AND user_id IN (
      SELECT id FROM users
      WHERE tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    )
  );
