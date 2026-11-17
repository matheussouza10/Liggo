# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Next.js (App Router), TypeScript, Prisma, PostgreSQL. Chosen at project start; a native app (iOS/Android) is planned for a later phase, after the web product.

## Users
Not yet confirmed in detail (the brand manual does not say). The product is a SaaS sold to customers who create and run sports competitions. Open decision: who the primary user is (for example organizers/administrators of tournaments, athletes and teams, or spectators) and in what situation they use it.

## Product Purpose
Liggo is a SaaS platform for organizing and following competitions: championships, tournaments, leagues and matches across multiple sports modalities, not tied to any single sport. It also covers the surrounding needs of running them ("e todo o resto", scope still to be itemized). Slogan suggested in the brand manual: *Toda competição começa aqui.*

## Positioning
Undecided. What a neighboring sports-management product could not truthfully copy has not been stated yet.

## Operating Context
Web first; a native mobile app follows later, so product decisions should not paint the web version into a corner that a mobile client cannot share (shared API and data model).

## Capabilities and Constraints
- Multi-sport: the model must support different modalities, not a single sport.
- Core entities named so far: tournaments, championships, matches. Further scope (teams, athletes, standings, brackets, scheduling, results, payments, public pages) is not yet decided.
- Multi-tenant SaaS: customers own their own competitions. Plans, billing and tenancy rules are undecided.
- Backend: PostgreSQL via Prisma 7, local database `liggo`.

## Brand Commitments
Source: "Liggo — Manual de Identidade Visual", v1.0, 17/11/2026, supplied by the user. Treat it as the binding brand reference; it is an initial guide and may be refined.

- **Name:** Liggo.
- **Concept:** technology, movement, connection and achievement. Symbol inspired by the letter L, tournament bracket paths and a stylized trophy, shown with the wordmark.
- **Personality:** modern, trustworthy, energetic, accessible, professional.
- **Slogan (suggested, not final):** "Toda competição começa aqui."
- **Brand colors (reference values):**
  - Electric blue `#187CFA`: primary action, links, selection, brand details.
  - Cyan/turquoise `#1CE6D3`: accent, highlights, indicators; reserve for important moments, avoid overuse.
  - Deep navy `#041B4B`: institutional, dark backgrounds, headers.
  - Secondary dark blue `#0B2E78`: dark cards, auxiliary elements, primary hover.
  - Ink `#091225`: text, titles, navigation.
  - White `#FFFFFF` and light background `#F7FAFC`: surfaces.
  - Brand gradient: `linear-gradient(90deg, #187CFA 0%, #1CE6D3 100%)`.
- **Color rules from the manual:** electric blue is the main action color; light and dark modes must be coherent without blindly reusing every color; avoid small white text directly on turquoise (use dark text); never rely on color alone for state, so wins, losses, suspensions and eliminations need text or icons as well; rankings, tables and brackets combine brand colors with separate accessible semantic colors (success, warning, error, info).
- **Logo kit (SVG):** `liggo-logo-horizontal`, `liggo-logo-branca` (for dark backgrounds), `liggo-simbolo`, `liggo-icone-app` (app/PWA), `liggo-favicon`. Do not distort, stretch, rotate or alter proportions; keep clear space of at least the height of the symbol's main stroke; use the symbol alone in small spaces; favicons need a simplified form. The kit's SVGs are vector recreations and lettering may still need converting to outlines.
- **Typography:** the manual suggests Inter (or similar metrics), titles at weights 600 to 800, body 400 to 500, tabular figures for tables and scores. It states this is **not yet an official approved brand font**, so the typeface remains an open decision.
- **Pre-launch checks still open:** INPI trademark availability, domain and social handles, favicon legibility at 16 and 32 px, app-store PNG exports, contrast and monochrome versions, final lettering typeface.

## Evidence on Hand
The SVG logo kit is in `public/branding/`: `liggo-logo-horizontal.svg`, `liggo-logo-branca.svg`, `liggo-simbolo.svg`, `liggo-icone-app.svg`, `liggo-favicon.svg`. No real content, customers or testimonials exist; future work must not fabricate any.

## Product Principles
Not derived yet; to be written once audience and positioning are confirmed.
