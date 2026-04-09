# UX Persona Tester - Memory

## Persona
Karl-Heinz, 55, Bezirksjägermeister, rural Bavaria. Non-technical. Uses phone for calls and WhatsApp only.
Conservative expectations: wants clear labels, obvious buttons, immediate feedback, no jargon.

## App Under Test
JMP (Jagd-Management-Portal) — React SPA, no backend, mock data only.
Frontend root: /Users/henrikkemmerling/IdeaProjects/jmp/src/

## Key Findings (First Full Review — 2026-03-09)

### Critical Gaps
- NO login page exists. App loads directly into dashboard as a pre-set demo user. See: ux-findings-session1.md
- "Dev Mode" role switcher in sidebar is visible to all users — a real member would see this and be confused.
- The app uses English terms in the navigation ("Organizer-Bereich") mixed with German — inconsistent.

### Stable Patterns Observed
- German labels are mostly appropriate (Mitglied, Organisator, Events, Profil)
- Wizard flows (EventWizard 4-step, MemberAddWizard 3-step) are structurally sound
- Confirmation dialogs exist before destructive actions (delete event, unregister)
- Success/error feedback exists in EventDetail but is missing after profile save (only 3s toast)
- "Geltungsbereich" label in EventWizard Step 1 is confusing for non-technical users

### Language Issues Found
- "Scope" used in OrgUnitTree page subtitle (raw English word)
- "Scope-Logik", "Scope-Regeln" in hint popovers — pure developer jargon
- "OrgUnit & Rolle" as wizard step title is a developer abbreviation
- "J. LJV", "J. Hegering", "J. Jagdschein" as table column headers are unexplained abbreviations
- "Anstehend" filter on Events page is fine; "Meine Anmeldungen" is clear
- Dashboard card "Einheiten im Scope" — "Scope" is English/technical

### Navigation Issues
- Sidebar entry says "Organizer-Bereich" (English loanword) — should be "Veranstaltungsbereich" or similar
- Two separate member-management entry points exist: sidebar "Mitgliederverwaltung" AND a tab inside "Organizer-Bereich" — confusing overlap
- No logout button anywhere visible to user

### Workflow Issues
- EventWizard Step 3 (Rollen): member assignment is a free-text field, not a picker — error-prone
- MemberAddWizard Step 2 header "OrgUnit & Rolle" uses developer abbreviation
- Profile page: "Briefanrede" field is confusing for a member who doesn't know what it is
- Profile page: "Externe Mitgliedsnummer" visible in organizer view but no explanation of what "extern" means
- OrgUnitTree "Scope (N)" button next to every node is developer-facing, not user-facing

## Files Reviewed
- src/App.js, src/context/AuthContext.jsx, src/components/Layout/Layout.jsx
- src/components/Dashboard/Dashboard.jsx
- src/components/Events/EventList.jsx, EventDetail.jsx
- src/components/Profile/Profile.jsx
- src/components/OrganizerArea/OrganizerArea.jsx, EventWizard.jsx
- src/components/MemberManagement/MemberManagement.jsx
- src/components/OrgUnitTree/OrgUnitTree.jsx
- src/components/AdminArea/AdminArea.jsx
- src/components/HintButton/HintButton.jsx

## Links
- Detailed session findings: ux-findings-session1.md
