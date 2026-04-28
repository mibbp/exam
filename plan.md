# Exam GPT Development Plan

## Phase 1: Architecture and UX baseline
- Refactor the frontend into routed admin and student applications.
- Replace the single-page prototype with dedicated layouts, typed services, and page modules.
- Establish login-based role routing for admin and student users.
- Build an admin dashboard and student exam hall shell that align with the reference system.

## Phase 2: Question bank upgrade
- Introduce question repositories as first-class entities.
- Support repository management, question management, filtering, authoring, import, and export.
- Enrich questions with analysis, tags, knowledge points, source, and status.

## Phase 3: Access control upgrade
- Add RBAC primitives: roles, permissions, role-permission assignments, user-role assignments.
- Support role listing, permission assignment, user listing, role binding, status changes, and password reset.
- Extend authentication payloads to include roles and permissions for frontend routing and action gating.

## Phase 4: Exam management
- Extend exams with pass score, attempt limits, open type, review settings, shuffle settings, anti-cheat, and result mode.
- Provide exam creation, editing, publish/unpublish, close, and scoreboard flows.
- Aggregate dashboard metrics and recent activity.

## Phase 5: Student exam loop
- Build exam hall, exam check, live session, submission, history, and wrong-question review pages.
- Support autosave, countdown, and anti-cheat event reporting with forced submit threshold handling.
- Surface attempt history and wrong-question review for students.

## Validation
- Backend build passes with the expanded Prisma model and services.
- Frontend build passes with the new routed structure and pages.
- Remaining production work is mainly database migration execution, richer permissions gating in UI, and deeper rollout hardening.
