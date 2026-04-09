    Update the user profile / personal data fields in the codebase to include all fields from the legacy CSV export that are missing from the current implementation.

The following fields need to be added to a user's personal data (profile form, display view, and any relevant data model/type definitions):

**Identity & Salutation**
- Anrede (salutation, e.g. Herr / Frau)
- Titel (academic or honorary title)
- Geschlecht (gender: m / w / d)
- Briefanrede (full letter salutation string, e.g. "Sehr geehrter Herr Kemmerling")
- Berufsgruppe (occupational group, e.g. Auszubildende/Student/Schüler)
- Geburtsort (place of birth)
- Nationalität (nationality, default: Deutschland)

**Contact — extend existing phone field into three separate fields**
- Telefon Privat (private phone)
- Telefon Dienstlich (work phone)
- Handy (mobile)

**Address**
- Straße
- PLZ
- Ort
- Land (default: Deutschland)
- Bezirk (district, optional free text)
- Separate postal address (Postanschrift) — only if different from residential:
    - Post Straße, Post PLZ, Post Ort, Post Land

**Membership Admin Fields (editable by Organizer/Admin only, not by the member themselves)**
- Externe Mitgliedsnummer / external_id (legacy Mitglieds_Nr, read-only after import)
- Bemerkungen (free-text notes, admin only)
- Ist externes Mitglied (boolean flag)

**Club Functions (Funktionen)** — repeatable entries, each with:
- Funktionsname (free text, e.g. Hegeringleiter, Kassenwart)
- Von-Datum (start date)
- Bis-Datum (end date, optional — empty = currently active)
- Optional: linked OrgUnit

**Awards & Honours (Ehrungen)** — repeatable entries, each with:
- Ehrungsname (free text, e.g. Goldene Ehrennadel)
- Datum der Ehrung (date awarded)

---

Notes:
- All address fields and the new contact fields are PII — only show them to the user themselves, or to Organizers/Admins within scope.
- Bemerkungen and the external ID are admin-only — never visible to the member themselves.
- Funktionen and Ehrungen are lists (0–N entries per user), not single fields.
- Do not add any payment, fee, or banking fields — those are out of scope for v1.
- The 10 Zusatzfelder from the legacy system are NOT added yet — their meaning is unconfirmed and will be mapped later.