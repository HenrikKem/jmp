# UX Walkthrough Session 1 — Full Report
Date: 2026-03-09
Persona: Karl-Heinz, 55, Bezirksjägermeister, Bayern

## Files Reviewed
All key source files in /Users/henrikkemmerling/IdeaProjects/jmp/src/

---

## Detailed Findings by Area

### 1. Login / First Impression
- CRITICAL: No login page. App opens directly as a pre-authenticated demo user.
- User sees no "Willkommen" message, no explanation of who they are logged in as.
- The sidebar shows a user block at the bottom with initials and role label — this is the only identity signal.
- "Dev Mode" toggle is visible at the bottom of the sidebar to all users. A real member would click it out of curiosity, see "Mitglied / Organisator / Admin" buttons, and have no idea what this does.

### 2. Dashboard
GOOD:
- Stat cards are clean and scannable.
- "Anstehende Events" mini-list is immediately useful.
- Clickable cards (Verfügbare Events, Meine Anmeldungen) with arrow hints are intuitive.

PROBLEMS:
- "Einheiten im Scope" — the word "Scope" is English/technical jargon. Should be "Verwaltungsbereiche" or "Organisationseinheiten".
- "Events in meinem Scope" — same issue.
- The "Aktueller Benutzer" section at the bottom of the dashboard is pure developer debug output. A real user would be confused seeing their email address and role badges listed under "Aktueller Benutzer". The hint text "Der Mock-Benutzer ist Mitglied in..." is explicitly developer-facing and should never appear in production.
- Dashboard heading says "Dashboard" twice — once in the page title bar (topbar) and once as an h2 inside the page. Redundant.

### 3. Sidebar Navigation
GOOD:
- "Dashboard", "Events", "Profil" are clear.
- "Organisation" is acceptable.
- Role-gated sections appear/disappear correctly based on role.

PROBLEMS:
- "Organizer-Bereich" uses an English loanword. Should be "Veranstaltungsverwaltung" or "Mein Verwaltungsbereich".
- "Dev Mode" section is completely out of place for a real user. It should not be visible in any production build.
- No "Abmelden" (logout) button anywhere. A user expects to be able to log out. The user dropdown (clicking the avatar in the topbar) only shows "Profil" and "Rolle wechseln" — "Rolle wechseln" is another developer-facing item.
- The divider label "Verwaltung" above the organizer-only items is helpful. Good.

### 4. Events Page (EventList)
GOOD:
- Cards are clean with date block, title, location, time, and scope tag.
- Filter buttons (Alle / Anstehend / Meine Anmeldungen) are clear.
- "Angemeldet" badge on registered events is immediately visible.
- Sorting by date is the right default.

PROBLEMS:
- Subtitle "Zeigt Events basierend auf Ihren Organisationszugehörigkeiten" is too long and bureaucratic. A member does not think in terms of "Organisationszugehörigkeiten". Should be something like "Alle Events für Ihren Jagdbezirk".
- The scope tag on each card (e.g. "Hegering: Hegering Münster-Nord") is repetitive — it says "Hegering:" and then the full name which often already contains "Hegering". Confusing duplication.
- No empty-state explanation if a member sees zero events — what should they do?

### 5. Event Detail Page
GOOD:
- Very clear layout: status banner at top (green check if registered), then details, then groups, then action button.
- Group cards with capacity bar and "X Plätze frei / Ausgebucht" are excellent — immediately understandable.
- Confirmation dialog before registration/cancellation is correct.
- "Bitte wählen Sie eine Gruppe aus" inline error prevents proceeding without selection.
- Success message "Sie wurden erfolgreich angemeldet!" is clear.

PROBLEMS:
- "Verantwortliche" section shows "Benutzer 1" / "Benutzer 2" as raw ID strings ("Benutzer {role.userId.replace('user-', '')}") — this looks broken. A user sees "Benutzer 1" with no name. Major credibility issue.
- The DSGVO/PrivacyInfo notice before registration: the content is good (important for a German audience) but the header/label for this section is not visible in the code — unclear if it has a title.
- "← Zurück zur Übersicht" back link is good and clearly placed.

### 6. Profile Page
GOOD:
- Sections are clearly separated: Persönliche Daten, Funktionen, Ehrungen, Organisationszugehörigkeiten.
- "Bearbeiten" button next to each section header is clear.
- "Speichern / Abbrechen" buttons in edit mode are in the right place.
- Success toast "Profil erfolgreich aktualisiert" appears after save. Good feedback.
- The DSGVO hint button with the visibility table is excellent — this is exactly what a German user needs to feel safe.
- "Jagdschein seit" field is perfectly domain-appropriate.

PROBLEMS:
- "Briefanrede" field — most members won't know what this is. Should have a tooltip or placeholder like "z.B. Sehr geehrter Herr Mustermann – für offizielle Schreiben".
- "Berufsgruppe" — unusual field for a hunting association. No explanation.
- Profile page shows "Keine Funktionen eingetragen" and "Keine Ehrungen eingetragen" without any explanation that these are managed by the organizer. A member might wonder why they can't edit these.
- "Verwaltungsfelder" section is shown to Organisators but labeled "Nur für Organisatoren" — this is good, but the section header color or visual separation should be more distinctive so it's clear this is a different kind of data.
- The "Organisationszugehörigkeiten" tree selector in edit mode shows the full national hierarchy (Bundesebene, Landesebene, etc.) — a normal member should only need to see/select their local Hegering. Showing the entire national tree is overwhelming.

### 7. Organisation Page (OrgUnitTree)
GOOD:
- The expandable tree with level badges is visually clear.
- The hierarchy legend at the bottom (Bundesverband, Landesverband, etc.) is helpful.

PROBLEMS:
- Opening subtitle reads: "Scope-Logik: Ein Organizer verwaltet seine zugewiesene Einheit und alle darunterliegenden Einheiten (Nachfahren)." — This is pure developer documentation, not user-facing text. A regular member has no idea what "Scope-Logik" or "Nachfahren" means in this context.
- Every node has a "Scope (N)" button. A regular member has no idea what "Scope" is. This button makes sense in a dev demo but should be removed or at least renamed to something like "Alle Untereinheiten anzeigen (N)".
- The page title is "Organisation" in the sidebar but "Organisationsstruktur" as the h2 inside the page. Minor inconsistency.
- There is no explanation of WHY a member would want to look at this page or what they should do with it. It reads as a technical diagram, not a member-facing page.

### 8. Organizer Area (as Organizer role)
GOOD:
- Two tabs "Events (N)" and "Mitglieder (N)" are clear.
- "+ Neues Event" button is prominent and obvious.
- Event cards show date, location, registration count, and action buttons clearly.
- "Entwurf" badge on unpublished events is helpful.
- Delete confirmation dialog with "Alle Anmeldungen werden storniert" warning is important and present.

PROBLEMS:
- Page title "Organizer-Bereich" uses English. Should be fully German.
- The "?" hint button (HintButton with "Scope-Information") opens a popover with "Scope-Regeln" — again, developer jargon inside a user interface. The content is actually useful, but the word "Scope" appears 5+ times. Replace with "Verwaltungsbereich" throughout.
- The "Mitglieder" tab here partially duplicates the "Mitgliederverwaltung" sidebar item. Two different places to manage members is confusing.
- Action buttons on event cards are small text-only links: "Bearbeiten / Gruppen / Rollen / Löschen". "Rollen" is ambiguous here — does it mean event roles (Eventleiter, Helfer) or member roles? Not clear.
- "Ansehen →" link opens the public event detail — good, but could be labeled "Vorschau" to be more explicit.

### 9. EventWizard — Full 4-Step Walkthrough

STEP 1 (Grunddaten):
GOOD: Clear required fields marked with *. Inline error messages appear immediately on failed submit. Date + time fields side by side. Placeholder text (z.B. Übungsschießen Frühjahr) is helpful.
PROBLEMS:
- "Geltungsbereich *" is a bureaucratic label. A normal person would call this "Für wen ist dieses Event sichtbar?" or simply "Veranstaltungskreis". The hint below it ("Das Event ist für alle Mitglieder dieser Einheit und deren Untereinheiten sichtbar") is helpful but should be shown more prominently, not as small grey text.
- Separate fields for start date and start time feels slightly old-fashioned but is understandable.
- No character limit shown on description field.

STEP 2 (Gruppen):
GOOD: The toggle "Veranstaltung hat Gruppen" is clear. Hint text explains the purpose. "+ Gruppe hinzufügen" button is clear.
PROBLEMS:
- When "Veranstaltung hat Gruppen" is checked, the user sees an empty list with "Noch keine Gruppen hinzugefügt." — but the "+ Gruppe hinzufügen" button is small (btn-sm) and easy to miss.
- Group form has "Gruppenname", "Kapazität", "Uhrzeit (optional)" — these are perfectly clear.
- The ✕ remove button on groups is very small and has no label. For a 55-year-old, this might be confusing.

STEP 3 (Rollen):
GOOD: "Rollen können auch später vergeben werden" is reassuring.
PROBLEMS:
- Step header says "Rollen" — ambiguous (same word used for member roles and event roles).
- The member assignment field is free text ("z.B. Max Mustermann") — this is an error-prone design. A user could type anything. Should be a searchable dropdown.
- "Eventleiter, Sicherheitsbeauftragter, Helfer, Schriftführer, Kassierer" as role options are reasonable but "Sicherheitsbeauftragter" is a long compound word — fine for German audience.

STEP 4 (Vorschau):
GOOD: The preview layout is clean with labeled sections. "Als Entwurf speichern" vs. "Veranstaltung erstellen" is a clear choice.
PROBLEMS:
- After clicking "Veranstaltung erstellen", the wizard closes but there is NO success notification. The user is just back on the Organizer-Bereich page. They have to look for the new event in the list to confirm it worked. This is a significant feedback gap.
- "Als Entwurf speichern" and "Veranstaltung erstellen" — it is not obvious that "Entwurf" means the event is hidden from members. The word "Entwurf" (draft) is understandable but the consequence (hidden = not visible to members) should be stated.

### 10. MemberAddWizard — Full 3-Step Walkthrough

STEP 1 (Mitglied suchen):
GOOD: Search field with autofocus is immediate. Member list with name + email is clear. Selection highlight is visible.
PROBLEMS:
- "Alle Mitglieder sind bereits im Scope" empty state uses the word "Scope" — should say "Alle verfügbaren Mitglieder wurden bereits hinzugefügt."
- No explanation of WHERE these members come from — are they existing system users? New invitations?

STEP 2 (OrgUnit & Rolle):
GOOD: Dropdown for org unit and role is simple and clear.
PROBLEMS:
- Step title "OrgUnit & Rolle" is developer language. Should be "Organisationseinheit & Rolle" or just "Zuweisung".
- The label "Organisationseinheit *" is fine. "Rolle" dropdown with "Mitglied / Organisator" is clear.

STEP 3 (Bestätigen):
GOOD: Clean confirmation card showing all three selections. Clear.
PROBLEMS:
- "Hinzufügen" button closes the wizard but again — no success notification. User is left wondering if it worked.
- No indication that the added member will receive any notification (email, etc.).

### 11. Mitgliederverwaltung (/manage page)
GOOD:
- The table with sortable columns is professional.
- Filter toolbar (search, OrgUnit, Status, Qualifikation) is comprehensive.
- "E-Mail-Adressen exportieren" is a genuinely useful feature for an organizer.
- Click-through drawer for member details is a good pattern.
- Funktionen and Ehrungen editors in the drawer are clear and practical.

PROBLEMS:
- Column headers "J. Jagdschein", "J. Hegering", "J. LJV" — the "J." abbreviation means "Jahre" (years) but this is not obvious at all. Should read "Jagdschein (J.)" or show the full label with the abbreviation in parentheses.
- "LJV" abbreviation (Landesjagdverband) is not explained anywhere. A new organizer from a different region might not know what LJV means.
- The drawer has a "Verwaltungsfelder" section labeled "Admin" — this badge says "Admin" in English. Should say "Organisator" or "Verwaltung" if it's for organizers.
- The "Bis (leer = aktuell)" label on the Funktionen end-date field is a bit developer-ish but actually understandable in context.
- No "Speichern" button visible for the drawer edits — changes appear to be saved in local state but it is not obvious that changes persist or when they are committed.

### 12. Admin Area
GOOD:
- Warning banner "Administrator-Modus" with ⚠️ is an appropriate safety signal.
- "Benutzerverwaltung" and "Organisationsstruktur" tabs are clear.
- New user dialog is simple (name + email only).
- New org unit dialog with level + parent selector is logical.

PROBLEMS:
- "Bearbeiten" and "Deaktivieren" buttons in the user table do nothing (no functionality). A user would click "Bearbeiten" and nothing would happen. This is a placeholder that should not be visible in a demo.
- The ✏️ edit icon on org unit cards also does nothing. Same issue.
- HintButton "Rollenverwaltung" popup uses the word "Scope" multiple times again.
- No feedback after creating a new user or org unit (beyond the modal closing).

---

## Summary Table

| Area | Severity | Issue |
|---|---|---|
| Login | CRITICAL | No login page at all |
| Dev Mode | CRITICAL | Visible to all users, confusing |
| Dashboard | HIGH | Debug "Aktueller Benutzer" section visible |
| Dashboard | MEDIUM | "Scope" jargon in card labels |
| OrgUnitTree | HIGH | "Scope-Logik" and "Scope" button — developer-facing text |
| EventWizard Step 1 | MEDIUM | "Geltungsbereich" label unclear |
| EventWizard Step 4 | HIGH | No success feedback after event creation |
| MemberAddWizard Step 2 | MEDIUM | "OrgUnit & Rolle" — developer label |
| MemberAddWizard Step 3 | HIGH | No success feedback after adding member |
| EventDetail | HIGH | "Verantwortliche" shows "Benutzer 1" raw IDs |
| MemberManagement | MEDIUM | "J. LJV", "J. Hegering" unexplained abbreviations |
| MemberManagement | HIGH | No save button in detail drawer |
| Sidebar | MEDIUM | "Organizer-Bereich" English loanword |
| Sidebar | HIGH | No logout button |
| Profile | MEDIUM | "Briefanrede" needs tooltip |
| Profile | HIGH | Funktionen/Ehrungen: no note that they are organizer-managed |
| Admin | MEDIUM | Non-functional "Bearbeiten"/"Deaktivieren" buttons |
