---
version: 1
slug: "src-app-auth-entrar-page-tsx"
primary_target: "src/app/(auth)/entrar/page.tsx"
related_targets: ["src/app/admin/entrar/page.tsx"]
---

# Login (organizadores) e login administrativo

Scope: two routes, `/entrar` (organizers and other users) and `/admin/entrar` (system admin). Mode: Operate.
Task: sign in with e-mail and password. Organizer route also offers "criar conta" and "esqueci a senha". Admin route has no sign-up and no public link.
Constraints: brand tokens only (PRODUCT.md); no invented claims; auth backend not connected yet, so submit returns an honest "not connected" error after validation.
Unresolved: sign-up and password-recovery routes do not exist yet; semantic (error/success) colors not defined by the brand manual.

## Direction contract

THESIS: Two doors, not one form with a switch. The organizer door is a plain working screen; the admin door is visibly a different, more sober room, so nobody confuses them. Refuses a tabbed or role-picker login.
OWN-WORLD: Restrained color. Organizer: light ground #F7FAFC, white card, electric blue action, follows the system color scheme. Admin: always dark (ink ground, navy card), turquoise action with ink text. Inter, 48px fields, labels above, 12px radius, one elevation (soft offset shadow, no border on the card).
STORY: The visitor recognizes Liggo by logo and slogan-free calm, knows which door they are in from the heading and ground, enters credentials, and gets a clear named error if it fails.
FIRST VIEWPORT: Centered card, max 28rem wide, vertically centered. Logo on top, heading, one-line helper, e-mail, password with show/hide, primary button full width, then the secondary links. Primary action is the full-width button at the bottom of the card.
FORM: pinned by the user ("duas telas distintas com rotas diferentes"); seed: none (pinned)
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
