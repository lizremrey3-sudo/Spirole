-- Seed: 16 published lessons with quiz questions
-- Uses a DO block so lesson IDs can be captured cleanly

DO $seed$
DECLARE
  l uuid;
BEGIN

-- ─── 1. OVERCOMING OBJECTIONS ───────────────────────────────────────────────
l := gen_random_uuid();
INSERT INTO lessons (id, title, slug, description, content_mdx, language_framework,
                     role_tags, industry_tags, order_index, is_published)
VALUES (
  l,
  'How to Overcome Patient/Customer Objections',
  'overcoming-objections',
  'Learn to handle pushback with empathy and a clear framework so conversations stay productive.',
  $content$
## What Is an Objection?

An objection is not a refusal — it is a request for more information or reassurance. When a patient says "that seems expensive" or "I need to think about it," they are telling you something is unclear or feels uncertain. Your job is to uncover the real concern, not argue against it.

## The FEEL — FELT — FOUND Framework

This three-step approach works in almost any situation:

1. **Feel** — Acknowledge their emotion. *"I understand how you feel."*
2. **Felt** — Normalize it. *"Many of our patients have felt the same way."*
3. **Found** — Share the resolution. *"What they found is that once they tried them, the difference was noticeable within the first week."*

This structure shows empathy first, builds trust second, and offers evidence third.

## The Four Most Common Objections

| Objection | What they really mean |
|-----------|----------------------|
| "It's too expensive." | "I'm not sure the value justifies the cost." |
| "I need to think about it." | "I'm not ready — something is unresolved." |
| "I'll just use my old glasses." | "Change feels risky right now." |
| "My insurance should cover more." | "I wasn't expecting out-of-pocket costs." |

## How to Respond

1. **Pause** — resist the urge to jump in. Let them finish completely.
2. **Confirm** — restate what you heard. *"So your main concern is the out-of-pocket cost?"*
3. **Bridge** — use FEEL-FELT-FOUND or ask an open question. *"What would help you feel confident about this?"*
4. **Offer a path** — give them a clear next step, not a sales pitch.

## What Not to Do

- Don't minimize their concern ("it's only $20 more").
- Don't rush to a solution before they feel heard.
- Don't take the objection personally.

## Practice Tip

After each patient interaction, identify one objection you heard. Write down how you responded and how you would use the framework next time. This builds muscle memory quickly.
  $content$,
  jsonb_build_object(
    'short_version', 'I understand how you feel — many patients feel the same way at first. What I can tell you is that once they moved forward, they found the difference was worth it. What specific concern can I help you address?',
    'long_version', 'I completely understand your hesitation. A lot of people feel the same way when they first hear the cost. What I want to share is that we see this come up often, and when patients do move forward, they consistently find that the improvement in their daily vision — whether that''s driving, reading, or screen time — makes it feel worthwhile. Can I walk you through exactly what''s included so you can weigh it fully?',
    'refusal_script', 'That''s completely fair, and I don''t want to pressure you at all. If you do decide to come back, just ask for me and I''ll pick right up where we left off. Is there anything I can send you in the meantime — a summary of what we talked about?',
    'do_not_say', jsonb_build_array('It''s not that expensive', 'Everyone buys this', 'You''ll regret it if you don''t')
  ),
  ARRAY['associate', 'staff'],
  ARRAY['all'],
  1,
  true
);
INSERT INTO lesson_quiz_questions (lesson_id, question, correct_answer, distractors, order_index) VALUES
  (l, 'What does an objection typically signal?', 'A request for more information or reassurance', ARRAY['A final decision to not buy', 'Rudeness from the customer', 'A complaint that must be escalated'], 1),
  (l, 'In the FEEL-FELT-FOUND framework, what comes first?', 'Acknowledging the patient''s emotion', ARRAY['Presenting evidence', 'Offering a discount', 'Referring to a manager'], 2),
  (l, 'When a patient says "I need to think about it," what is the best response?', 'Ask an open question to uncover the unresolved concern', ARRAY['Tell them the offer expires today', 'Agree and end the conversation', 'List all the product features again'], 3);


-- ─── 2. ASKING FOR HELP ────────────────────────────────────────────────────
l := gen_random_uuid();
INSERT INTO lessons (id, title, slug, description, content_mdx, language_framework,
                     role_tags, industry_tags, order_index, is_published)
VALUES (
  l,
  'Communicating with Your Peers: How to Ask for Help',
  'asking-for-help',
  'Build confidence in asking colleagues for support — quickly, clearly, and without wasting their time.',
  $content$
## Why Asking for Help Is a Skill

Hesitating to ask for help costs the team twice: once when the problem festers, and again when it surfaces at the worst possible time. Asking for help is not a sign of weakness — it is a sign that you care about doing the job right.

## When to Ask vs. Handle It Yourself

**Ask immediately if:**
- A patient's safety or health is at risk
- You are missing information that you can't access on your own
- You've tried the same approach twice and it hasn't worked
- The situation is escalating and you are not trained to de-escalate

**Handle it yourself first if:**
- You have access to the answer (system, manual, prior training)
- It will take you less time to look it up than to interrupt someone
- The stakes are low and a small mistake is recoverable

## The SBAR Method

SBAR (Situation, Background, Assessment, Request) is used in clinical settings to communicate efficiently. It works equally well on the practice floor:

1. **Situation** — What is happening right now?
2. **Background** — What context does the listener need?
3. **Assessment** — What do you think is going on?
4. **Request** — What exactly do you need from them?

**Example:**
> "Hey, I have a patient at the front who's upset about their bill — the insurance paid less than expected (Situation). She's been waiting 20 minutes and I've already checked the claim twice (Background). I think there may be a coordination-of-benefits issue (Assessment). Can you come take a look with me or advise on the next step? (Request)"

## How to Phrase It

Don't say: *"I don't know what to do."*
Do say: *"I've tried X and Y — can I run this by you for 60 seconds?"*

This shows you've already made an effort, respects the colleague's time, and sets clear expectations.

## Following Up

After someone helps you, close the loop: *"That worked — thank you."* This builds trust and makes people more willing to help again.
  $content$,
  jsonb_build_object(
    'short_version', 'Hey, quick question — I have a patient situation I''ve tried to resolve twice and I''m not getting traction. Can I walk you through it in 60 seconds and get your take?',
    'long_version', 'I want to make sure I handle this correctly so I''m hoping to get a second opinion. Here''s the situation: [describe]. I''ve already tried [approach 1] and [approach 2]. My best guess is [assessment]. What would you do next?',
    'refusal_script', 'Totally understand if now''s not a good time — when would work? I can hold the patient for a few minutes if that helps.',
    'do_not_say', jsonb_build_array('I have no idea what to do', 'Nobody told me how to handle this', 'This isn''t my job')
  ),
  ARRAY['associate', 'staff'],
  ARRAY['all'],
  2,
  true
);
INSERT INTO lesson_quiz_questions (lesson_id, question, correct_answer, distractors, order_index) VALUES
  (l, 'What does the "A" in SBAR stand for?', 'Assessment', ARRAY['Action', 'Authorization', 'Assistance'], 1),
  (l, 'Which of the following is the best way to ask a colleague for help?', '"I''ve tried X and Y — can I run this by you for 60 seconds?"', ARRAY['"I don''t know what to do."', '"Can you just handle this for me?"', '"Nobody explained this to me."'], 2),
  (l, 'When should you ask for help immediately?', 'When a patient''s safety is at risk', ARRAY['Whenever you feel uncertain about anything', 'Only when your manager is available', 'After you have tried something at least five times'], 3);


-- ─── 3. DE-ESCALATION ──────────────────────────────────────────────────────
l := gen_random_uuid();
INSERT INTO lessons (id, title, slug, description, content_mdx, language_framework,
                     role_tags, industry_tags, order_index, is_published)
VALUES (
  l,
  'De-escalating a Difficult Interaction',
  'de-escalation',
  'Stay calm under pressure and guide upset patients or customers back to a productive conversation.',
  $content$
## Why Interactions Escalate

People escalate when they feel unheard, disrespected, or helpless. The trigger is rarely about the specific issue — it is about the emotional experience. Your goal is not to solve the problem in the first 30 seconds but to lower the temperature enough so that problem-solving becomes possible.

## The Four Phases of Escalation

1. **Frustration** — The person is tense but still communicating normally.
2. **Agitation** — Voice rises, words become sharper, body language closes.
3. **Aggression** — Personal comments, raised voice, demands.
4. **Crisis** — Yelling, threats, or threatening behavior.

Your tools work best in phases 1 and 2. The earlier you intervene, the easier it is.

## The CALM Framework

**C — Connect.** Use their name. Make eye contact. Put down what you're doing.

**A — Acknowledge.** Name the emotion without judgment. *"I can see this has been really frustrating."*

**L — Listen.** Let them finish. Do not interrupt. Nod. Resist the urge to explain or defend.

**M — Move forward.** Once they have vented, offer one concrete next step.

## What Works — and What Doesn't

| Do | Don't |
|----|-------|
| "I understand why you'd feel that way." | "Calm down." |
| "Let me focus on this right now." | "That's our policy." |
| "What would make this right for you?" | "There's nothing I can do." |
| Speak slowly and quietly | Match their volume or speed |

## Your Own Regulation

You cannot calm someone else if you are dysregulated yourself. Before you respond:
- Take a slow breath
- Drop your shoulders
- Speak at 80% of your normal speed

If you feel unsafe at any point, involve a manager immediately.

## When to Involve a Manager

Bring in a manager if:
- The person becomes threatening or uses profane language directed at you
- The issue requires authority you don't have
- You have tried the framework and the situation has not improved

Always brief the manager before they step in: *"Patient is upset about X, I've acknowledged and offered Y, they're still frustrated."*
  $content$,
  jsonb_build_object(
    'short_version', 'I hear you, and I want to make sure I help you get this sorted out. Can you tell me more about what happened so I have the full picture?',
    'long_version', 'I can see this has been really frustrating, and I''m sorry this has been your experience. I want to give you my full attention right now. Can you walk me through exactly what happened from the beginning? I''m going to listen and then we''ll figure out the best path forward together.',
    'refusal_script', 'I understand you''re not satisfied with that, and I respect that. Let me get my manager involved so we can make sure this gets resolved at the right level. I''ll be right back.',
    'do_not_say', jsonb_build_array('Calm down', 'That''s our policy and there''s nothing I can do', 'You''re not being reasonable', 'I''ve already explained this')
  ),
  ARRAY['associate', 'staff'],
  ARRAY['all'],
  3,
  true
);
INSERT INTO lesson_quiz_questions (lesson_id, question, correct_answer, distractors, order_index) VALUES
  (l, 'What is the primary goal in the first 30 seconds of a difficult interaction?', 'Lower the emotional temperature so problem-solving becomes possible', ARRAY['Resolve the complaint immediately', 'Explain company policy clearly', 'Involve a manager right away'], 1),
  (l, 'What does the "A" in CALM stand for?', 'Acknowledge', ARRAY['Apologize', 'Assert', 'Advise'], 2),
  (l, 'Which phrase should you avoid when de-escalating?', '"Calm down."', ARRAY['"I hear you."', '"What would make this right for you?"', '"Let me focus on this right now."'], 3);


-- ─── 4. HIPAA BASICS ───────────────────────────────────────────────────────
l := gen_random_uuid();
INSERT INTO lessons (id, title, slug, description, content_mdx, language_framework,
                     role_tags, industry_tags, order_index, is_published)
VALUES (
  l,
  'HIPAA Basics: What It Is and How to Talk About It',
  'hipaa-basics',
  'Understand HIPAA fundamentals and confidently explain privacy practices to patients.',
  $content$
## What Is HIPAA?

The Health Insurance Portability and Accountability Act (HIPAA) is a federal law that protects patients' health information. In an optical setting, HIPAA applies any time you handle a patient's prescription, diagnosis, vision history, or insurance details.

## Protected Health Information (PHI)

PHI is any information that could identify a patient AND relates to their health. This includes:
- Name combined with prescription or diagnosis
- Date of service
- Insurance ID numbers
- Photos taken for fitting purposes
- Electronic records in your practice management system

## Common HIPAA Risks in Optical Practices

- Discussing a patient's prescription within earshot of others in the waiting area
- Leaving a patient chart visible on the front desk
- Emailing a prescription to an unverified address
- Sharing records with a family member without explicit patient authorization

## What You Are Allowed to Do

- Share information with other providers involved in the patient's care (ophthalmologist, PCP)
- Discuss with a patient's designated authorized representative
- Use information for treatment, payment, and healthcare operations (the "TPO" exceptions)

## How to Respond to Patients Asking About Privacy

Patients sometimes ask why you need to verify their identity or why you can't just hand records to a family member. A calm, confident explanation is the best response — it builds trust.

## Your Responsibilities

1. Never access records you don't need for a current task
2. Log out of practice management systems when leaving your workstation
3. Report potential breaches to your manager immediately — do not wait
4. Complete annual HIPAA training as required by your practice

Violations can result in significant fines for the practice and disciplinary action for the individual. When in doubt, ask your manager before sharing any patient information.
  $content$,
  jsonb_build_object(
    'short_version', 'For your privacy and protection, I need to verify your date of birth before I can access your records. This is required by federal law — it only takes a second.',
    'long_version', 'We take your privacy very seriously here. HIPAA — the federal health privacy law — requires us to verify your identity before accessing or sharing any of your health information. That''s why I need to confirm your date of birth and address before we pull up your records. I know it can feel like an extra step, but it''s there to protect you.',
    'refusal_script', 'I completely understand the frustration. Unfortunately, I''m not able to release records without patient authorization — that''s a federal requirement, not just our practice policy. Here''s a quick authorization form that would allow us to share with [person]. It only takes a minute to complete.',
    'do_not_say', jsonb_build_array('It''s just our policy', 'I''m not sure if I can share that', 'Don''t worry, it''s fine')
  ),
  ARRAY['associate', 'staff', 'receptionist'],
  ARRAY['optical'],
  4,
  true
);
INSERT INTO lesson_quiz_questions (lesson_id, question, correct_answer, distractors, order_index) VALUES
  (l, 'Which of the following is an example of PHI?', 'A patient''s name combined with their eyeglass prescription', ARRAY['A patient''s favorite frame brand', 'A general waiting time survey response', 'Staff scheduling information'], 1),
  (l, 'Under HIPAA''s TPO exceptions, when can you share patient information without a separate authorization?', 'For treatment, payment, and healthcare operations', ARRAY['Any time the patient is present in the office', 'Only with written consent', 'With any family member who asks'], 2),
  (l, 'What should you do if you suspect a HIPAA breach?', 'Report it to your manager immediately', ARRAY['Wait to see if anyone notices', 'Send an email to the patient', 'Delete the information in question'], 3);


-- ─── 5. NEW PATIENT CHECK-IN ────────────────────────────────────────────────
l := gen_random_uuid();
INSERT INTO lessons (id, title, slug, description, content_mdx, language_framework,
                     role_tags, industry_tags, order_index, is_published)
VALUES (
  l,
  'Checking In a New Patient',
  'new-patient-checkin',
  'Create a welcoming first impression while collecting the information the clinical team needs.',
  $content$
## The First 30 Seconds Matter

A new patient's first impression of your practice is formed before they sit down. A warm greeting, a clean workspace, and a calm, organized demeanor set the tone for the entire visit — and influence whether they return.

## New Patient Check-In: Step by Step

**Step 1 — Greet immediately.**
Acknowledge every patient within 10 seconds of arrival, even if you're on a call. A brief nod and eye contact signals they've been seen.

**Step 2 — Confirm the appointment.**
*"Welcome! Are you here for a [time] appointment with Dr. [name]?"*

**Step 3 — Collect and verify information.**
For new patients, you'll need:
- Full legal name and preferred name
- Date of birth (for HIPAA identity verification)
- Address and phone number
- Insurance card (front and back)
- Photo ID
- Emergency contact

**Step 4 — Introduce forms.**
Hand them the intake packet or direct them to the tablet. Let them know approximately how long it takes.

**Step 5 — Manage the wait.**
If there's a delay, proactively communicate it. Don't let patients wonder.

**Step 6 — Hand off to clinical staff.**
Use the patient's name and a warm transition: *"Dr. [name]'s team will be right with you, [patient name]."*

## Privacy at the Front Desk

- Lower your voice when discussing anything health-related
- Face the computer screen away from other waiting patients
- Never confirm a patient's diagnosis or prescription out loud in the waiting area

## Handling Questions You Can't Answer

New patients often have clinical questions before they're seen — about what the exam involves, whether they need dilation, or how long it takes. It's better to say *"Dr. [name] will walk you through that during your exam"* than to guess.

## Common Situations

- **Patient arrives without insurance card:** Collect what you can and flag for billing.
- **Appointment is not in the system:** Check with the scheduler before turning them away.
- **Patient needs a form in another language:** Alert your manager and use available translation resources.
  $content$,
  jsonb_build_object(
    'short_version', 'Welcome! I''m [name]. Are you here for your appointment today? Let me get you checked in — I''ll just need to see your insurance card and a photo ID.',
    'long_version', 'Welcome to [Practice Name], it''s great to have you here! I''m [name] and I''ll be getting you checked in today. Since this is your first visit with us, I''ll need your insurance card and a photo ID, and I''ll have you fill out a short intake form — it usually takes about five minutes. Dr. [name] will see you shortly after that.',
    'refusal_script', 'No problem at all — a lot of patients forget. Let me take down the information you have and we can follow up with your insurance company. It won''t delay your appointment.',
    'do_not_say', jsonb_build_array('I need your insurance card or we can''t see you', 'You should have brought your ID', 'We''re running really behind today')
  ),
  ARRAY['receptionist', 'associate', 'staff'],
  ARRAY['optical'],
  5,
  true
);
INSERT INTO lesson_quiz_questions (lesson_id, question, correct_answer, distractors, order_index) VALUES
  (l, 'Within how many seconds should you acknowledge a patient upon arrival?', '10 seconds', ARRAY['30 seconds', 'As soon as you finish your current task', 'After confirming their appointment in the system'], 1),
  (l, 'A new patient asks about what dilation involves before seeing the doctor. What should you do?', 'Let them know the doctor will explain during the exam', ARRAY['Explain the dilation procedure in detail', 'Tell them it''s optional', 'Refer them to your website'], 2),
  (l, 'Why should you lower your voice when discussing health details at the front desk?', 'To protect patient privacy under HIPAA', ARRAY['Because it is more polite', 'To avoid waking patients who are sleeping', 'Practice policy unrelated to privacy law'], 3);


-- ─── 6. INSURANCE QUESTIONS ────────────────────────────────────────────────
l := gen_random_uuid();
INSERT INTO lessons (id, title, slug, description, content_mdx, language_framework,
                     role_tags, industry_tags, order_index, is_published)
VALUES (
  l,
  'Handling Insurance Questions',
  'insurance-questions',
  'Answer common insurance questions confidently and set accurate expectations about coverage.',
  $content$
## Why Insurance Conversations Are Tricky

Insurance language is confusing by design — copays, allowances, out-of-pocket maximums, in-network vs. out-of-network. Most patients don't understand what their plan covers until they get the bill. Your job is to translate, set realistic expectations, and prevent unpleasant surprises.

## Vision Insurance vs. Medical Insurance

Many patients don't realize they may have two separate benefits:
- **Vision insurance** (VSP, EyeMed, Davis Vision, etc.) — covers routine eye exams and a frame/lens allowance
- **Medical insurance** (Blue Cross, Aetna, United, etc.) — may cover a medical eye exam if the visit is for a diagnosed condition (glaucoma, diabetes, etc.)

## Key Terms to Know

| Term | What it means |
|------|--------------|
| **Copay** | Fixed amount patient pays at time of service |
| **Allowance** | Maximum dollar amount insurance covers for frames or lenses |
| **Deductible** | Amount patient pays out-of-pocket before insurance kicks in |
| **In-network** | Provider has a contract with the insurer — lower rates |
| **Out-of-network** | Higher cost; may require patient to submit claim themselves |
| **Coordination of benefits** | When two plans exist; determines which pays first |

## Verifying Benefits

Always verify before the appointment or at check-in. Tell the patient upfront what the coverage includes and what their expected out-of-pocket will be. Never let a patient be surprised at checkout.

If a patient has two plans, note this immediately and alert billing.

## When You Don't Know the Answer

Insurance is complex. If you're unsure, say:
*"Let me verify that with our billing specialist and get back to you in a moment — I want to make sure I give you accurate information."*

Never guess on insurance coverage. An incorrect answer creates a bigger problem than a brief wait for the right one.
  $content$,
  jsonb_build_object(
    'short_version', 'Based on your plan, your exam is covered at 100% and you have a $150 frame allowance. Anything above the allowance would be your responsibility — let me show you options within that range.',
    'long_version', 'I pulled up your benefits and here''s what I''m seeing: your exam is fully covered as a routine visit. For eyewear, your plan gives you a $150 frame allowance and covers standard lenses. If you choose upgrades like anti-reflective coating or a frame over the allowance, those would be billed to you at a discounted rate. I can give you a cost estimate before anything is ordered — would that be helpful?',
    'refusal_script', 'I understand that''s frustrating — especially when you expected it to be covered. Let me pull up the explanation of benefits so we can see exactly what was applied and why. Sometimes there''s a coordination issue we can appeal.',
    'do_not_say', jsonb_build_array('I think your insurance covers that', 'Your insurance should pay for everything', 'Just give me your card and we''ll figure it out later')
  ),
  ARRAY['receptionist', 'associate', 'insurance_specialist'],
  ARRAY['optical'],
  6,
  true
);
INSERT INTO lesson_quiz_questions (lesson_id, question, correct_answer, distractors, order_index) VALUES
  (l, 'What is the difference between vision insurance and medical insurance in an optical context?', 'Vision covers routine care and eyewear; medical covers conditions like glaucoma or diabetes', ARRAY['They are the same thing with different names', 'Medical insurance covers frames; vision covers exams', 'Vision insurance is only for contact lenses'], 1),
  (l, 'A patient''s frame allowance is $150 and they choose a $210 frame. What is their out-of-pocket cost?', '$60', ARRAY['$150', '$210', '$0 because insurance covers the difference'], 2),
  (l, 'You are unsure whether a patient''s second insurance plan covers a specific lens upgrade. What should you do?', 'Tell the patient you''ll verify with billing and get back to them', ARRAY['Guess based on similar plans you''ve seen', 'Tell the patient it''s probably covered', 'Ask the patient to call their insurer themselves'], 3);


-- ─── 7. LATE ARRIVAL ────────────────────────────────────────────────────────
l := gen_random_uuid();
INSERT INTO lessons (id, title, slug, description, content_mdx, language_framework,
                     role_tags, industry_tags, order_index, is_published)
VALUES (
  l,
  'Managing a Late Arrival',
  'late-arrival',
  'Handle late patients with empathy while protecting the schedule for everyone else.',
  $content$
## The Challenge with Late Arrivals

Late arrivals create a ripple effect: the patient behind them waits longer, the doctor's schedule compresses, and stress levels rise for everyone. At the same time, patients are often embarrassed about being late and arrive already defensive.

Your goal: make a clear decision, communicate it kindly, and move on quickly.

## The Standard Policy

Most practices have a grace period (typically 10–15 minutes). Know your practice's policy before you need it. The decision about whether to accommodate a late patient is usually based on:

- How late they are
- How long the appointment is
- Whether the doctor's schedule has any flex
- What's waiting ahead of them

## How to Have the Conversation

1. **Welcome them first.** Don't lead with the problem.
2. **Acknowledge the situation calmly.** *"I see your appointment was at 2:00 — you're at [time] now."*
3. **State what's possible.** Either you can accommodate, or you can't.
4. **Offer a path forward.** Rebook, waitlist, or see if clinical staff can still fit them.

## If You Can Accommodate

Keep it low-key. Don't make them feel guilty — they know. Just get them checked in efficiently.

## If You Cannot Accommodate

This is the harder conversation. Be direct but kind:

*"Unfortunately, at [X] minutes late, Dr. [name]'s schedule doesn't allow us to fit in the full appointment — we'd be cutting into the next patient's time. I want to get you rescheduled as soon as possible."*

Then immediately offer the next available appointment. Having a solution ready reduces frustration.

## What to Avoid

- Don't lecture them about being late
- Don't apologize for having a policy
- Don't make the decision based on how the patient reacts — be consistent
  $content$,
  jsonb_build_object(
    'short_version', 'Welcome! I see your appointment was at [time]. Let me check with our clinical team and see what we''re able to do — give me just a moment.',
    'long_version', 'Hi [name], welcome in! Your appointment was at [time], and I want to be upfront with you — we''re at [X] minutes past. I''m going to check right now to see whether we can still fit you in for the full exam or whether we''ll need to get you rescheduled. I want to make sure you get the full time with the doctor. One moment please.',
    'refusal_script', 'I completely understand, and I''m sorry you hit traffic. At this point, we''re not able to run the full exam without pushing back the patients who''ve been waiting. I have an opening on [day] at [time] — can I get you set up for that?',
    'do_not_say', jsonb_build_array('You should have left earlier', 'This happens all the time', 'I can''t help you', 'You''ll just have to wait and see')
  ),
  ARRAY['receptionist', 'associate'],
  ARRAY['optical'],
  7,
  true
);
INSERT INTO lesson_quiz_questions (lesson_id, question, correct_answer, distractors, order_index) VALUES
  (l, 'When a patient arrives late, what should you do first?', 'Greet them warmly before addressing the situation', ARRAY['Immediately tell them they may not be seen', 'Ask them why they were late', 'Check the policy before saying anything to them'], 1),
  (l, 'Why should you be consistent when deciding whether to accommodate a late patient?', 'Inconsistency creates perceived unfairness and erodes trust', ARRAY['Consistency is required by HIPAA', 'You will be evaluated on your consistency score', 'It prevents patients from filing complaints'], 2),
  (l, 'If you cannot accommodate a late patient, what should you do immediately after delivering the news?', 'Offer the next available appointment', ARRAY['Ask them to wait in case there''s a cancellation', 'Hand them a complaint form', 'Tell them to call back tomorrow'], 3);


-- ─── 8. OPTICAL BASICS ──────────────────────────────────────────────────────
l := gen_random_uuid();
INSERT INTO lessons (id, title, slug, description, content_mdx, language_framework,
                     role_tags, industry_tags, order_index, is_published)
VALUES (
  l,
  'Optical Basics: Understanding Prescriptions',
  'optical-basics',
  'Read and explain eyeglass prescriptions so patients understand what they''re getting.',
  $content$
## Reading a Prescription

An eyeglass prescription looks like a code, but each part has a clear meaning. Being able to explain it builds patient confidence and reduces confusion at pickup.

## The Key Fields

| Field | Abbreviation | What it means |
|-------|-------------|---------------|
| Right eye | OD (Oculus Dexter) | The right eye |
| Left eye | OS (Oculus Sinister) | The left eye |
| Sphere | SPH | The basic lens power. Negative = nearsighted. Positive = farsighted. |
| Cylinder | CYL | The amount of astigmatism correction needed |
| Axis | AX | The direction of the astigmatism (0–180 degrees) |
| Add | ADD | Near-vision addition, used for bifocals and progressives |
| Pupillary Distance | PD | Distance between the centers of the pupils |

## Sphere Power

- **Negative SPH** (e.g., -3.00): nearsightedness — patient sees better up close, struggles at distance
- **Positive SPH** (e.g., +2.50): farsightedness — patient may struggle both near and far
- **Plano (PL or 0.00)**: no sphere correction needed

## Cylinder and Astigmatism

Astigmatism means the eye isn't perfectly round, causing blur at all distances. The CYL and AX work together — the cylinder without the axis is meaningless.

If the CYL is blank or zero, the patient has no significant astigmatism.

## Pupillary Distance

PD is critical for centering lenses correctly. A PD that's off by even 2mm can cause eyestrain. Always confirm the PD is recorded before completing an order. Some patients have different PDs for each eye (listed as two numbers, e.g., 32/30).

## Explaining to Patients

Patients often ask: *"Is my prescription getting worse?"* You can explain the numbers without making clinical judgments — that's the doctor's role. You can say: *"Your prescription is [stronger/weaker] in the sphere and about the same in the cylinder — Dr. [name] can walk you through what that means for your vision."*
  $content$,
  jsonb_build_object(
    'short_version', 'Your prescription has a mild nearsightedness correction in both eyes and a small amount of astigmatism in your right eye — that''s the cylinder number. The axis just tells us which direction to orient that correction. Pretty straightforward!',
    'long_version', 'Let me walk you through this. The SPH number tells us how much correction your eyes need overall — negative means nearsighted, so you see better up close. The CYL and axis work together to correct astigmatism, which just means there''s a slight irregularity in the shape of the eye. And the ADD at the bottom is for reading — that gets built into the bottom of progressive lenses so you have a smooth transition from distance to near.',
    'refusal_script', 'That''s a great question and the doctor is best positioned to answer it. What I can do is make sure she''s aware you''d like to discuss the change — would you like me to put a note in your chart?',
    'do_not_say', jsonb_build_array('Your eyes are getting much worse', 'That''s a pretty bad prescription', 'I''m not sure what this means')
  ),
  ARRAY['associate', 'optician', 'staff'],
  ARRAY['optical'],
  8,
  true
);
INSERT INTO lesson_quiz_questions (lesson_id, question, correct_answer, distractors, order_index) VALUES
  (l, 'A patient has a sphere of -4.00. What does this mean?', 'The patient is nearsighted', ARRAY['The patient is farsighted', 'The patient has astigmatism', 'The patient needs reading glasses only'], 1),
  (l, 'What is the pupillary distance (PD) used for?', 'Centering the lenses correctly in the frame', ARRAY['Measuring the strength of the lens', 'Determining the axis for astigmatism', 'Calculating the add power for progressives'], 2),
  (l, 'A patient asks if their prescription is getting worse. What is the appropriate response?', 'Describe the change in numbers and suggest the doctor can explain what it means for their vision', ARRAY['Confirm that yes, their eyes are deteriorating', 'Tell them prescriptions never get worse', 'Refuse to show them their prescription'], 3);


-- ─── 9. SINGLE VISION TROUBLESHOOTING ──────────────────────────────────────
l := gen_random_uuid();
INSERT INTO lessons (id, title, slug, description, content_mdx, language_framework,
                     role_tags, industry_tags, order_index, is_published)
VALUES (
  l,
  'Troubleshooting Single Vision Lenses',
  'single-vision-troubleshooting',
  'Diagnose and address the most common complaints with new single vision lenses.',
  $content$
## Why New Glasses Feel "Off"

It is normal for new single vision lenses to feel slightly different for 1–3 days as the brain and visual system adapt. However, some complaints signal a real problem. Knowing the difference protects the patient and the practice.

## The Most Common Complaints

**"Everything looks a little blurry."**
- Normal for up to 3 days with a new prescription
- Not normal if it persists beyond a week or if the previous pair is dramatically clearer

**"I have a headache."**
- Often related to adaptation, especially if the prescription changed significantly
- Could also indicate incorrect PD, wrong axis, or lenses placed incorrectly in the frame

**"Things look distorted or bent."**
- In single vision lenses, this usually points to a measurement error
- Check the PD first; also verify the optical center height

**"The lenses seem too strong / too weak."**
- Could be a lab error — the wrong power was made
- Verify against the prescription, then compare to the work order

## Your Troubleshooting Checklist

1. Ask when the glasses arrived and how long they've been wearing them
2. Ask how the previous pair felt by comparison
3. Check the frame fit — tilted or slipped frames cause distortion
4. Verify the PD and optical center with a lensometer if you're trained
5. Escalate to the optician or doctor if the complaint persists past the adaptation window

## When to Escalate

Escalate immediately if:
- The power is measurably different from the prescription
- The patient has significant nausea or vomiting
- The patient cannot function at work or driving

Document everything before you escalate: what the patient said, what you checked, and what you found.
  $content$,
  jsonb_build_object(
    'short_version', 'It''s really common for new glasses to feel a little different for the first day or two — your brain adjusts. Let''s check the fit first and make sure the frame is sitting right, and then we''ll take it from there.',
    'long_version', 'Thank you for coming back in. New lenses can feel off at first, especially if your prescription changed — your visual system needs a few days to recalibrate. That said, I want to make sure everything is correct. Let me check the frame alignment first, then I''d like to verify the measurements match your prescription. We''ll figure out what''s going on.',
    'refusal_script', 'I hear you — it shouldn''t still feel off at this point. I want to pull in our optician to take a look with a lensometer and verify the power. If there''s an error on our end, we absolutely want to make it right. Can you give me a moment to get them?',
    'do_not_say', jsonb_build_array('You just have to get used to them', 'There''s nothing wrong with these', 'Your old glasses were probably wrong')
  ),
  ARRAY['associate', 'optician'],
  ARRAY['optical'],
  9,
  true
);
INSERT INTO lesson_quiz_questions (lesson_id, question, correct_answer, distractors, order_index) VALUES
  (l, 'A patient says their new single vision lenses feel blurry after 2 days. What is the most appropriate first response?', 'Explain that 1–3 days of adaptation is normal, and offer to check the frame fit', ARRAY['Tell them the prescription must be wrong', 'Immediately remake the lenses', 'Ask them to try again for two more weeks'], 1),
  (l, 'Which of the following complaints in a new single vision patient is most likely to indicate a measurement error?', 'Objects appear distorted or bent', ARRAY['Mild blur during the first day', 'Eyes feel tired at the end of the day', 'The frames feel slightly heavy'], 2),
  (l, 'When should you escalate a new glasses complaint immediately?', 'When the measured power is different from the prescription', ARRAY['After the patient has worn them for at least two weeks', 'Only if the patient becomes angry', 'When the patient says they have a headache'], 3);


-- ─── 10. PROGRESSIVE TROUBLESHOOTING ────────────────────────────────────────
l := gen_random_uuid();
INSERT INTO lessons (id, title, slug, description, content_mdx, language_framework,
                     role_tags, industry_tags, order_index, is_published)
VALUES (
  l,
  'Troubleshooting Progressive Lenses',
  'progressive-troubleshooting',
  'Help patients through the progressive lens learning curve and identify real fitting issues.',
  $content$
## Why Progressives Are Different

Progressive lenses have three zones in one lens: distance (top), intermediate (middle), and near (bottom). The transition between zones creates soft distortion in the peripheral areas. This is by design — but it can feel disorienting for first-time wearers.

## Normal Adaptation vs. Real Problems

**Normal (first 1–2 weeks):**
- Peripheral blur or "swim" effect (rocking sensation when moving)
- Needing to point nose more directly at objects
- Difficulty with stairs or curbs at first
- Mild eyestrain or fatigue

**Not normal (investigate immediately):**
- Blurry center distance vision that doesn't clear
- Inability to find the reading zone even after instruction
- Worse than expected distortion that hasn't improved after 2 weeks
- Headaches that persist past week one

## Helping a First-Time Wearer

Walk them through these three techniques:
1. **Look through the top** for distance — not the bottom
2. **Lower the chin slightly** to look through the intermediate zone at a computer
3. **Tilt the reading material slightly** and lower your gaze for near

Practice with them in the office before they leave. This reduces callbacks significantly.

## Fitting Issues That Cause Problems

| Issue | Symptom |
|-------|---------|
| Frame sits too low | Distance zone is wrong height |
| Frame tilted sideways | Imbalance between eyes |
| Seg height too high/low | Can't find reading zone |
| PD incorrect | Edge distortion, eye strain |

Always check frame fit and seg height with a fitting cross or measuring gauge.

## The Two-Week Rule

Most practices offer a two-week check-in for new progressive wearers. This is a goodwill visit that catches fitting problems early. Encourage patients to return before the problem becomes frustrating.

## When to Involve the Doctor

If distortion is severe and fit is confirmed correct, the prescription itself may need to be reviewed. This is a clinical decision — loop in the doctor rather than guessing.
  $content$,
  jsonb_build_object(
    'short_version', 'Progressives have a learning curve — the ''swim'' feeling in the first week is completely normal. Let me show you exactly how to use each zone and we''ll check the fit before you leave.',
    'long_version', 'Progressive lenses are one lens that does three jobs — distance at the top, computer range in the middle, and reading at the bottom. The sides of the lens are softer, which can feel a bit wobbly at first, especially on stairs or when turning your head quickly. That''s normal for the first week or two. What helps most is learning to point your nose more directly at what you want to see rather than just moving your eyes. Let me demonstrate here in the office.',
    'refusal_script', 'You''re right that two weeks should have been enough to adjust. Let me check the fit and measurements — if everything looks right physically, I''d like to get you back in with the doctor to review the prescription. We want you to be able to use these comfortably.',
    'do_not_say', jsonb_build_array('Everyone struggles with progressives at first — you just need to try harder', 'There''s nothing wrong, you just haven''t adapted yet', 'Progressives aren''t for everyone')
  ),
  ARRAY['associate', 'optician'],
  ARRAY['optical'],
  10,
  true
);
INSERT INTO lesson_quiz_questions (lesson_id, question, correct_answer, distractors, order_index) VALUES
  (l, 'A patient is picking up their first progressive lenses. What should you do before they leave the office?', 'Walk them through how to use each zone and check the frame fit', ARRAY['Tell them to come back if they have problems', 'Warn them they will struggle for a month', 'Recommend they switch to bifocals instead'], 1),
  (l, 'Which symptom in a progressive lens wearer is NOT considered part of normal adaptation?', 'Blurry center distance vision that does not clear after a week', ARRAY['Mild swim effect in the first week', 'Needing to point the nose at objects', 'Slight difficulty with stairs in the first few days'], 2),
  (l, 'A patient still cannot find their reading zone after two weeks. What is the most likely cause?', 'A fitting issue — the seg height or frame position may be off', ARRAY['The patient is not trying hard enough', 'Progressive lenses are not strong enough for reading', 'The patient needs a different prescription strength'], 3);


-- ─── 11. CONTACT LENS BASICS ────────────────────────────────────────────────
l := gen_random_uuid();
INSERT INTO lessons (id, title, slug, description, content_mdx, language_framework,
                     role_tags, industry_tags, order_index, is_published)
VALUES (
  l,
  'Contact Lens Basics and Care Instructions',
  'contact-lens-basics',
  'Educate new contact lens wearers with confidence and accurate safety information.',
  $content$
## Types of Contact Lenses

**By replacement schedule:**
- Daily disposables — throw away every night, no cleaning needed
- Bi-weekly — replaced every two weeks, cleaned nightly
- Monthly — replaced monthly, cleaned nightly

**By design:**
- Spherical — correct nearsightedness or farsightedness
- Toric — correct astigmatism (keyed to rotate into proper position)
- Multifocal — correct presbyopia with multiple powers in one lens

**Extended wear**: Some lenses are FDA-approved for overnight wear, but most eye care providers don't recommend sleeping in contacts due to infection risk.

## Care Instructions for Reusable Lenses

1. **Always wash and dry your hands** before handling lenses
2. **Use only recommended contact lens solution** — never water or saliva
3. **Rub and rinse** the lens even with "no-rub" solutions
4. **Replace your case monthly** — cases are a primary source of contamination
5. **Never top off solution** — empty and refill the case each time
6. **Remove before swimming, showering, or sleeping** (unless cleared by doctor)

## The Biggest Risks

- **Sleeping in lenses**: increases infection risk 6–8×
- **Water exposure**: *Acanthamoeba* is a rare but devastating amoeba found in tap water
- **Overwearing**: beyond 12–14 hours causes hypoxia (oxygen deprivation) to the cornea
- **Using expired lenses**: degraded lens material can scratch the cornea

## Red Flags — When to Remove and Call the Office

Patients should remove lenses immediately if they experience:
- Redness that doesn't clear in 10 minutes after removal
- Significant pain or light sensitivity
- A "foreign body" sensation that doesn't resolve
- Any blurry vision that isn't corrected by blinking

## How to Explain Insertion

For a first-time wearer:
1. Wash hands thoroughly, dry with a lint-free towel
2. Place lens on the index finger, check it's right-side-out (cup shape, not flipped)
3. Pull down lower lid with the middle finger of the same hand
4. Pull up upper lid with the other hand
5. Place lens directly on the iris, blink slowly

Practice in the office. A quick session here prevents a panicked call the next morning.
  $content$,
  jsonb_build_object(
    'short_version', 'The most important rules: always wash your hands first, never use water on your lenses, and take them out before bed. If your eye gets red or painful after they''re out, call us right away.',
    'long_version', 'New lenses feel like a big adjustment but most patients get comfortable within a week. Here''s what I want you to remember: hands always clean and dry before you touch your lenses, solution only — never rinse with water — and replace your case every month. Sleeping in them is the number one thing that causes infections, so we want you removing them every night. If you ever have redness, pain, or blur that doesn''t clear up after you take them out, call us the same day.',
    'refusal_script', 'I understand it''s tempting to leave them in overnight, but the infection risk really does increase dramatically. If you''re finding it hard to keep to the schedule, let''s talk to the doctor about whether an extended-wear lens might be a safer fit for your lifestyle.',
    'do_not_say', jsonb_build_array('It''s fine to sleep in them occasionally', 'Just rinse them with water if you run out of solution', 'You probably won''t get an infection')
  ),
  ARRAY['associate', 'optician', 'staff'],
  ARRAY['optical'],
  11,
  true
);
INSERT INTO lesson_quiz_questions (lesson_id, question, correct_answer, distractors, order_index) VALUES
  (l, 'A patient runs out of contact lens solution. What should they use to rinse their lenses?', 'They should not wear the lenses and get more solution', ARRAY['Tap water', 'Saline solution', 'Eye drops'], 1),
  (l, 'How often should a patient replace their contact lens case?', 'Monthly', ARRAY['Every 6 months', 'Only when it looks dirty', 'Annually'], 2),
  (l, 'A patient calls and says their eye is red and painful after removing their contacts. What should you advise?', 'Come in the same day for evaluation', ARRAY['Apply eye drops and wait 24 hours', 'Put the lenses back in to see if it helps', 'Take an over-the-counter antihistamine'], 3);


-- ─── 12. FRAME AND LENS OPTIONS ─────────────────────────────────────────────
l := gen_random_uuid();
INSERT INTO lessons (id, title, slug, description, content_mdx, language_framework,
                     role_tags, industry_tags, order_index, is_published)
VALUES (
  l,
  'Explaining Frame and Lens Options',
  'frame-lens-options',
  'Present eyewear options clearly without overwhelming patients so they can make confident choices.',
  $content$
## The Challenge of Too Many Options

Patients often feel overwhelmed when presented with dozens of frame styles and multiple lens upgrades. Your job is not to present every option — it's to curate a relevant selection and explain the trade-offs clearly.

## Common Frame Materials

| Material | Benefits | Best for |
|----------|---------|---------|
| Acetate | Rich colors, adjustable, premium feel | Fashion-forward patients |
| Titanium | Lightweight, hypoallergenic, durable | Sensitive skin, everyday wear |
| TR-90 (nylon) | Flexible, impact-resistant, affordable | Active patients, kids |
| Stainless steel | Durable, affordable, adjustable | Budget-conscious patients |

## Lens Materials

**CR-39 (plastic)**: Standard. Clear optics, easy to coat. Heavier with strong prescriptions.

**Polycarbonate**: Impact-resistant (required for kids, safety), thinner than CR-39, slight optical distortion at edges.

**Trivex**: Similar to polycarbonate but better optics. Lighter. Slightly more expensive.

**High-index (1.67, 1.74)**: For stronger prescriptions. Dramatically thinner and lighter.

**When to recommend high-index**: If the prescription is above ±4.00 sphere, high-index lenses will look significantly better and be noticeably lighter.

## Lens Treatments Worth Explaining

- **Anti-reflective (AR) coating**: Reduces glare, improves cosmetic appearance, reduces halos at night. Recommend for virtually everyone.
- **UV protection**: Essential. Most quality lenses include it; worth confirming.
- **Blue light filtering**: Reduces high-energy visible light from screens. Useful for heavy screen users.
- **Photochromic (Transitions)**: Darken in sunlight, clear indoors. No need for a separate pair of sunglasses for many patients.
- **Polarized (for sunglasses)**: Eliminates reflected glare from water, snow, roads.

## How to Present Options

1. **Start with their lifestyle.** Ask: *"Are you on a computer a lot? Do you drive at night? Any outdoor activities?"*
2. **Recommend based on answers.** Don't read them a menu — tailor it.
3. **Anchor with must-haves, offer upgrades as adds.** *"Your prescription really benefits from high-index — I'd recommend that as a baseline. From there, AR coating makes a big difference for night driving. And if you spend a lot of time outdoors..."*
4. **Summarize the cost before ordering.**
  $content$,
  jsonb_build_object(
    'short_version', 'Based on your prescription and your daily activities, I''d recommend high-index lenses — they''ll be noticeably thinner and lighter. From there, the AR coating is worth adding for night driving and screen time. Want me to show you what that looks like on a few different frames?',
    'long_version', 'You mentioned you drive a lot at night and work on screens all day, so let me tailor my recommendations to that. First, with your prescription strength, high-index lenses will look dramatically better — thinner, lighter, no thick edges. Second, AR coating is almost a given for night driving — it cuts the halos and glare significantly. And a blue light filter on top of that adds about $30 and is worth it if you''re on a screen 6+ hours a day. Let me put together a full estimate for you.',
    'refusal_script', 'Totally fair — we can definitely keep it straightforward. The standard CR-39 lens is a great option and will give you clear vision. Just know that with your prescription, the edges will be a bit thicker. Totally functional, just a cosmetic trade-off. Want me to show you some frames that minimize that?',
    'do_not_say', jsonb_build_array('You should definitely get all the upgrades', 'The cheap lenses won''t last', 'Your prescription is too strong for standard lenses')
  ),
  ARRAY['associate', 'optician'],
  ARRAY['optical'],
  12,
  true
);
INSERT INTO lesson_quiz_questions (lesson_id, question, correct_answer, distractors, order_index) VALUES
  (l, 'A patient has a prescription of -5.50. Which lens material would you most likely recommend?', 'High-index (1.67 or 1.74)', ARRAY['CR-39 standard plastic', 'Polycarbonate', 'Trivex'], 1),
  (l, 'A patient says they drive a lot at night. Which lens add-on should you prioritize recommending?', 'Anti-reflective (AR) coating', ARRAY['Blue light filter', 'Photochromic', 'UV protection only'], 2),
  (l, 'What is the best first question to ask when helping a patient select lenses?', 'Ask about their lifestyle — screen time, driving habits, outdoor activities', ARRAY['Ask what their budget is', 'Ask what lens material they had before', 'Ask their opinion on photochromic lenses'], 3);


-- ─── 13. UNEXPECTED BILLING ─────────────────────────────────────────────────
l := gen_random_uuid();
INSERT INTO lessons (id, title, slug, description, content_mdx, language_framework,
                     role_tags, industry_tags, order_index, is_published)
VALUES (
  l,
  'Handling Billing and Unexpected Charges',
  'unexpected-billing',
  'Deliver unexpected cost news with calm, transparency, and a clear path forward.',
  $content$
## Why Billing Conversations Go Wrong

Unexpected charges feel like a broken promise. The patient thought they understood what was covered, and now they're being asked to pay more than they expected. Their reaction — frustration, anger, disbelief — is rarely about the money alone. It's about the feeling that something wasn't communicated.

Your job is not to defend the charge. Your job is to explain it, empathize with the reaction, and offer options.

## The Most Common Unexpected Charges in Optical

- **Insurance paid less than expected** (plan year reset, deductible not met)
- **Out-of-network charges** the patient didn't realize applied
- **Upgrades ordered that weren't fully authorized**
- **Coordination of benefits confusion** (two plans, unexpected split)
- **Annual exam covered, additional tests (visual fields, OCT) are not**

## How to Deliver Bad News Well

**Step 1 — Anticipate when possible.**
Check benefits before the patient leaves the exam room. The worst time to discover a coverage issue is at checkout with other patients waiting.

**Step 2 — Lead with acknowledgment.**
*"I want to walk you through how this cost was calculated, because I know it's more than you expected."*

**Step 3 — Explain, don't defend.**
Walk through the EOB line by line if helpful. Demystify the codes. Show your work.

**Step 4 — Offer paths.**
- Can the charge be broken into a payment plan?
- Can you appeal to insurance on their behalf?
- Is there a discount available for same-day payment?

**Step 5 — Stay calm.**
Their frustration is not personal. The calmer you are, the faster the conversation de-escalates.

## When to Involve Billing

If the charge involves a billing code dispute, a potential claim error, or anything you're not certain about — loop in billing or your manager before committing to an answer. An incorrect promise about what insurance will cover creates a second, worse conversation.
  $content$,
  jsonb_build_object(
    'short_version', 'I want to walk you through exactly how this amount was calculated — your insurance covered X, and the remaining Y is your responsibility based on your plan. I know that''s more than you expected, and I want to make sure you understand where it''s coming from.',
    'long_version', 'I completely understand this feels like a surprise, and I want to make it as clear as possible. Here''s what happened: your insurance paid [amount] toward the exam and [amount] toward the lenses. The remaining balance is from [specific reason — deductible, out-of-network, add-on not covered]. I want to double-check that everything was filed correctly — can you give me a moment to pull up the claim? If we find an error, we''ll correct it immediately. If not, I have a couple of options I can offer you.',
    'refusal_script', 'I hear you — and I don''t want you to leave unhappy. Let me escalate this to our billing specialist who can review the claim more carefully. If there''s an error on our end, we absolutely want to fix it. If it turns out the claim was processed correctly, we''ll talk through your options. Can I get a callback number for you?',
    'do_not_say', jsonb_build_array('That''s just what insurance does', 'There''s nothing we can do', 'You should have read your policy')
  ),
  ARRAY['receptionist', 'associate', 'insurance_specialist'],
  ARRAY['optical'],
  13,
  true
);
INSERT INTO lesson_quiz_questions (lesson_id, question, correct_answer, distractors, order_index) VALUES
  (l, 'When is the worst time to discover an insurance coverage issue for a patient?', 'At checkout with other patients waiting', ARRAY['During the exam', 'When the patient calls to schedule', 'When the lenses arrive from the lab'], 1),
  (l, 'A patient is upset about an unexpected bill. What should be your first priority?', 'Acknowledge their frustration and explain how the charge was calculated', ARRAY['Immediately offer a discount', 'Tell them to contact their insurance company directly', 'Defend the billing as correct'], 2),
  (l, 'When should you involve billing or a manager in an unexpected charge conversation?', 'When the charge involves a billing code dispute or you''re uncertain about the answer', ARRAY['Only when the patient requests it', 'After you have given the patient a final answer', 'Never — you should always handle it yourself'], 3);


-- ─── 14. GIVING FEEDBACK ────────────────────────────────────────────────────
l := gen_random_uuid();
INSERT INTO lessons (id, title, slug, description, content_mdx, language_framework,
                     role_tags, industry_tags, order_index, is_published)
VALUES (
  l,
  'Giving Feedback That Lands',
  'giving-feedback',
  'Deliver feedback that changes behavior without damaging trust or morale.',
  $content$
## Why Most Feedback Fails

Feedback fails when it is vague (*"you need to be more attentive"*), delayed (*"remember three weeks ago..."*), or delivered in front of others. The person receiving it becomes defensive, disengaged, or hurt — none of which lead to behavior change.

Effective feedback is specific, timely, and private.

## The SBI Model (Situation — Behavior — Impact)

SBI gives feedback a structure that makes it factual rather than personal:

1. **Situation** — Name the specific context. *"In this morning's check-in with Mrs. Green..."*
2. **Behavior** — Describe what you observed. *"You didn't verify her insurance before she sat down."*
3. **Impact** — Explain the effect. *"She waited 20 extra minutes at checkout while we sorted out the coverage."*

The key: SBI keeps feedback about what happened, not about who the person is.

## Corrective vs. Positive Feedback

Both require the same discipline. Don't just use SBI for corrections — use it when someone does something right.

*"In this morning's opening (S), you had the system ready and greeted the first patient by name (B). That set a great tone for the whole shift (I)."*

Positive SBI is not the same as general praise. *"Good job today"* is nice. Specific SBI builds the behavior you want to repeat.

## Timing and Setting

- **Corrective feedback**: within 24 hours when possible; private setting; not in front of patients or peers
- **Positive feedback**: as close to the moment as possible; can be in front of peers if comfortable for the person

## What to Do After You Give Feedback

1. Ask for their perspective: *"What was your read on that situation?"*
2. Listen. They may have context you don't.
3. Agree on what would be different next time.
4. Follow up. Don't give feedback once and never mention it again.

## The Manager's Goal

Your goal is not compliance — it's growth. The associate who understands why something matters will perform better than the one who just follows a rule. Lead with the impact.
  $content$,
  jsonb_build_object(
    'short_version', 'I want to talk with you about [specific situation]. What I observed was [specific behavior], and the impact was [specific effect]. I''d like to understand your perspective and talk about what we''d do differently next time.',
    'long_version', 'I want to give you some feedback from [time/situation]. I''m bringing this up because I think you''re capable of handling it differently and I want to support that. Here''s what I observed: [specific behavior]. The impact on the patient/team was [specific effect]. I''m curious — what was going through your mind in that moment? [Listen.] Here''s what I''d like to see next time: [clear expectation]. Does that feel doable?',
    'refusal_script', 'I hear that you saw it differently, and I appreciate you sharing that. Let me hold both perspectives. Even if [situation] played out in a way that was outside your control, I still want us to think about what we could each do differently. What would you want me to do differently as your manager in that situation?',
    'do_not_say', jsonb_build_array('You always do this', 'Everyone has noticed', 'I shouldn''t have to tell you this')
  ),
  ARRAY['manager'],
  ARRAY['all'],
  14,
  true
);
INSERT INTO lesson_quiz_questions (lesson_id, question, correct_answer, distractors, order_index) VALUES
  (l, 'In the SBI model, what does the "B" stand for?', 'Behavior — a specific observable action', ARRAY['Benchmark — the expected standard', 'Balance — positive and negative notes', 'Background — context behind the action'], 1),
  (l, 'Why should corrective feedback be given in private?', 'To prevent defensiveness and allow the person to respond honestly', ARRAY['Because company policy requires it', 'To avoid wasting time in team meetings', 'So the team doesn''t know about the mistake'], 2),
  (l, 'After giving feedback, what is the most important next step?', 'Ask for the employee''s perspective and listen', ARRAY['Send a follow-up email to document the conversation', 'Observe them closely for the next week without engaging', 'End the meeting and let them reflect on their own'], 3);


-- ─── 15. TEAM HUDDLE ────────────────────────────────────────────────────────
l := gen_random_uuid();
INSERT INTO lessons (id, title, slug, description, content_mdx, language_framework,
                     role_tags, industry_tags, order_index, is_published)
VALUES (
  l,
  'Running an Effective Team Huddle',
  'team-huddle',
  'Lead a focused, energizing daily huddle that sets the team up for a strong shift.',
  $content$
## Why Huddles Matter

A well-run huddle takes 10 minutes and saves 30. It aligns the team on what the day looks like, surfaces issues before they become problems, and signals that you care about starting the shift with intention.

A poorly run huddle wastes time and signals the opposite.

## The 10-Minute Structure

**1. Check-in (2 min)** — A quick pulse on the team.
*"How's everyone doing? Anything from yesterday we should know about going into today?"*
This is not therapy — it's awareness. A staff member who's exhausted or preoccupied needs light support or a role adjustment, not to be ignored.

**2. Metrics (2 min)** — What does the day look like?
- Appointment volume and type
- Any high-complexity patients (new progressives, post-op, difficult history)
- Insurance or billing flags

**3. Focus topic (4 min)** — One thing to improve or reinforce today.
Rotate the topic weekly: patient greeting, lens presentation, callbacks, close rate on upgrades. Keep it concrete and teachable, not a lecture.

**4. Action items and close (2 min)** — Clear assignments.
*"Today: [Name] owns the 2pm VIP patient. [Name] is handling the lab pickup at noon. Any questions?"*

Close with energy: *"Let's have a great one."*

## Common Mistakes

- **Going over 10 minutes**: if it takes 20, people stop coming prepared
- **Turning it into a complaint session**: redirect with *"Let's put that in the parking lot and circle back after patients"*
- **Skipping the huddle when busy**: that's exactly when you need it

## Making It a Habit

Start at the same time every day. Stand up — sitting down turns a huddle into a meeting. Keep people engaged by rotating who presents the focus topic.

## When There's Bad News

If there's a difficult issue to address (staffing change, patient complaint, policy update), say it clearly and early. Don't bury it in the middle or end. Uncertainty is more destabilizing than hard information.
  $content$,
  jsonb_build_object(
    'short_version', 'Good morning everyone — quick check before we open. We have [X] patients today. [Any flags]. Our focus for today is [topic]. [Name] has [task]. Any questions? Great — let''s go.',
    'long_version', 'Morning, team. Before we open, let''s take ten minutes. First: how''s everyone doing — anything from yesterday? [Pause for responses.] Today we have [X] appointments. We have [specific situation] coming in at [time] — here''s what to know about that. Our focus this week is [topic] — specifically, I want us all trying [concrete action]. Any pushback on that? [Name], can you own [task] today? OK — anything else? Let''s make it a good one.',
    'refusal_script', 'I hear the concern — let''s put that in the parking lot for now and we can dig into it after patients today. I don''t want to skip past it. Let''s make sure we circle back at [time].',
    'do_not_say', jsonb_build_array('Does anyone have any problems?', 'This will only take a second', 'Same as yesterday, nothing new')
  ),
  ARRAY['manager'],
  ARRAY['all'],
  15,
  true
);
INSERT INTO lesson_quiz_questions (lesson_id, question, correct_answer, distractors, order_index) VALUES
  (l, 'How long should an effective team huddle last?', '10 minutes', ARRAY['5 minutes', '20–30 minutes', 'As long as it takes to cover everything'], 1),
  (l, 'What is the best body posture for a daily huddle?', 'Standing up', ARRAY['Seated around a table', 'Virtual — online meetings are more efficient', 'Whatever is most comfortable for the team'], 2),
  (l, 'When there is difficult news to share in a huddle, when should you address it?', 'Early and clearly — don''t bury it in the middle or end', ARRAY['After the positive items to end on a high note', 'In a separate one-on-one after the huddle', 'Only if team members ask about it'], 3);


-- ─── 16. COACHING A STRUGGLING ASSOCIATE ────────────────────────────────────
l := gen_random_uuid();
INSERT INTO lessons (id, title, slug, description, content_mdx, language_framework,
                     role_tags, industry_tags, order_index, is_published)
VALUES (
  l,
  'Coaching a Struggling Associate',
  'coaching-struggling-associate',
  'Diagnose why an associate is underperforming and create a clear path forward — together.',
  $content$
## The Most Common Mistake Managers Make

They assume the problem is motivation when it's actually a skill gap — or vice versa. The intervention for a skill problem (training, coaching, observation) is completely different from the intervention for a will problem (accountability, clarity on expectations, consequences).

Before you act, diagnose.

## Skill vs. Will Diagnostic

**Skill gap**: The associate doesn't know how to do something.
Signs: inconsistent performance, errors that follow a pattern, lack of confidence when observed.
Intervention: training, shadowing, practice, clear feedback.

**Will gap**: The associate knows how but isn't doing it.
Signs: performance varies based on who's watching, shortcuts taken when unsupervised, lack of care for outcomes.
Intervention: clear expectations, accountability, consequence.

Most performance issues are a mix — address both.

## The GROW Model

A structured coaching conversation:

1. **Goal** — What does the associate want to achieve? (or what do you need them to achieve?)
2. **Reality** — What's actually happening right now? (Specific, factual, non-judgmental)
3. **Options** — What could they try? Brainstorm together.
4. **Will (Way Forward)** — What will they commit to? By when?

The manager's job in GROW is to ask, not tell. The more the associate generates the solution, the more likely they are to follow through.

## Documenting the Conversation

You don't need a formal write-up for every coaching conversation — but you do need a written record of:
- What was discussed
- What was agreed upon
- The timeframe for follow-up
- Any previous conversations on the same topic

If the situation escalates to a PIP or termination, this documentation protects both parties.

## The Follow-Up Is Non-Negotiable

A coaching conversation without follow-up sends the message that you weren't serious. Set a specific check-in date in the conversation: *"Let's talk again in two weeks — same time, same place."*

Then keep that appointment.

## When Coaching Isn't Enough

If the associate's performance hasn't improved after coaching, clear expectations, and reasonable time — and the will is clearly not there — that's a management decision, not a coaching decision. Involve HR if your practice has it. Document everything.
  $content$,
  jsonb_build_object(
    'short_version', 'I want to check in with you about [specific issue]. I''m not here to put you on the spot — I want to understand what''s getting in the way and figure out how I can help. Can you walk me through how you''ve been approaching [situation]?',
    'long_version', 'Thanks for making time to meet. I want to be direct with you: I''ve noticed [specific pattern] over the last [timeframe]. I''m not here to make assumptions — I want to hear your perspective first. Can you tell me how you''ve been thinking about [area]? [Listen.] Here''s what I''m seeing from my end: [specific observations]. I''m wondering what would help you feel more confident in that area. [Options discussion.] I''d like us to agree on one or two things to try between now and [date], and then I want to check back in with you then. What feels like the right first step?',
    'refusal_script', 'I hear that you don''t think this is a performance issue. I want to understand your perspective fully. Can you help me see what I might be missing? [Listen.] Here''s the thing: regardless of the cause, I need [specific outcome] to happen consistently. What would it take from your side to make that possible?',
    'do_not_say', jsonb_build_array('Everyone else manages to do this', 'I''ve already told you this twice', 'If this doesn''t improve you know what happens')
  ),
  ARRAY['manager'],
  ARRAY['all'],
  16,
  true
);
INSERT INTO lesson_quiz_questions (lesson_id, question, correct_answer, distractors, order_index) VALUES
  (l, 'What is the critical first step before coaching a struggling associate?', 'Diagnose whether the issue is a skill gap or a will gap', ARRAY['Deliver feedback using SBI immediately', 'Consult HR before any conversation', 'Give them a written warning'], 1),
  (l, 'In the GROW model, what does the manager''s role look like during the "Options" phase?', 'Ask questions and let the associate generate solutions', ARRAY['Provide a list of approved options', 'Decide the best option for them', 'Skip this step if time is short'], 2),
  (l, 'Why is written documentation important after a coaching conversation?', 'It creates a record if the situation escalates and protects both parties', ARRAY['It is required for every conversation by law', 'It replaces the need for a follow-up meeting', 'It proves the manager gave feedback'], 3);

END;
$seed$;
