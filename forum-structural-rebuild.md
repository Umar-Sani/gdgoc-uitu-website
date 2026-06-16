# Forum Structural Rebuild Plan

This document details the step-by-step plan for converting the GDGOC UITU forum index page layout from card-based feeds into a table-like topic list structure matching the layout of the Google Discuss/Antigravity forums (without changing the existing color theme/styling).

---

## 🛠️ Project Type: WEB
- **Frontend Stack:** Next.js (React), Tailwind CSS
- **Backend Stack:** Node.js, Express, PostgreSQL

---

## 🎯 Success Criteria
1. The forum main page lists threads in a clean, compact tabular row layout rather than card panels.
2. The columns displayed on desktop include:
   - **Topic** (Title, Category Badge, inline tags, Pin/Lock icons)
   - **Posters** (Overlapping avatar bubbles of the author and up to 4 other reply contributors)
   - **Replies** (Numeric response count)
   - **Views** (Numeric view count)
   - **Activity** (Relative time elapsed since the last post/reply)
3. Responsive design handles mobile screens by collapsing columns gracefully (e.g. hiding Posters/Views and displaying replies/activity inline underneath the topic details).
4. The color scheme, gradients, background colors, and badge designs remain completely untouched.

---

## 💻 Tech Stack
- **Database / Schema:** PostgreSQL (no schema modifications needed; backend will aggregate user avatars from the `forum.replies` table dynamically)
- **API Endpoint:** Express routes updating `/api/forum/threads` to return participant metadata
- **Frontend Component:** Next.js Server & Client components using Tailwind CSS grid layouts

---

## 📂 File Structure
```
📂 project-root/
├── 📂 backend/
│   └── 📂 src/
│       └── 📂 routes/
│           └── 📄 forum.ts           <-- Update GET /threads SQL query
└── 📂 frontend/
    └── 📂 app/
        └── 📂 (public)/
            └── 📂 forum/
                └── 📄 page.tsx       <-- Rebuild Thread list markup & styles
```

---

## 📋 Task Breakdown

### Phase 1: Backend API Enhancement (P0)

#### Task B1: Update Thread List Query for Participants
- **Agent:** `backend-specialist`
- **Skills:** `api-patterns`, `database-design`
- **Dependencies:** None
- **INPUT:** `backend/src/routes/forum.ts`
- **OUTPUT:** Updated `GET /threads` endpoint returns a `participants` array (names and avatar URLs of the first 4 reply authors) alongside the thread details.
- **VERIFY:** Send a HTTP request to `GET /api/forum/threads` and verify the JSON output contains `participants: [{ full_name, avatar_url }, ...]` for threads with replies.

---

### Phase 2: Frontend Data Types and Helper updates (P1)

#### Task F1: Update Thread Data Types
- **Agent:** `frontend-specialist`
- **Skills:** `clean-code`
- **Dependencies:** Task B1
- **INPUT:** `frontend/app/(public)/forum/page.tsx`
- **OUTPUT:** Updated `Thread` type alias with optional `participants` structure.
- **VERIFY:** Compile checks pass without any implicit `any` errors.

---

### Phase 3: UI Redesign - Discourse Table Structure (P2)

#### Task F2: Rebuild Thread Row Component
- **Agent:** `frontend-specialist`
- **Skills:** `frontend-design`, `tailwind-patterns`
- **Dependencies:** Task F1
- **INPUT:** `frontend/app/(public)/forum/page.tsx` (`ThreadCard` component)
- **OUTPUT:** Replace the container card structure with a clean table row component using a Tailwind CSS grid (`grid-cols-12` or flex columns):
  - **Topic Cell:** Title (with hover effects, pin/lock indicators), category badge underneath, and small tag pills.
  - **Posters Cell:** Multi-avatar stack showing overlapping circles (`-space-x-2`) for the original author and up to 4 participants.
  - **Replies Cell:** Centered reply count text.
  - **Views Cell:** Centered view count text.
  - **Activity Cell:** Right-aligned time since the last post.
- **VERIFY:** Page compiles and renders thread items in rows with matching design parameters.

#### Task F3: Responsive Layout Adaptations
- **Agent:** `frontend-specialist`
- **Skills:** `frontend-design`, `tailwind-patterns`
- **Dependencies:** Task F2
- **INPUT:** `frontend/app/(public)/forum/page.tsx`
- **OUTPUT:** Responsive mobile adjustments (using standard `hidden md:flex` or similar grid alignments) so table structures collapse into stack layout on smaller viewports.
- **VERIFY:** Resize browser to mobile size and confirm no horizontal overflow occurs, and content reads cleanly.

---

## 🔍 Phase X: Final Verification

Execute these verification checks before marking completion:
- [ ] Run `npx tsc --noEmit` in `frontend/` to check for type errors.
- [ ] Run `npm run lint` in `frontend/` to confirm code style rules.
- [ ] Validate responsive design layouts on both desktop and mobile viewports.
- [ ] Confirm no brand color scheme or style choices were changed.

---
