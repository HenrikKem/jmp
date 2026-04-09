# Task Sheet — UI Restyling

## Goal
Restyle the entire application with a clean, professional look inspired by WISO MeinVerein Web. The design language is **functional minimalism**: white content areas, a structured dark sidebar, green as the single accent color, grey for secondary information, black for primary text. No decorative gradients, no color overload.

---

## Design System — Tokens (define once, use everywhere)

Define these as CSS variables / Tailwind config / design tokens before touching any component:

### Colors
```
--color-bg:           #F5F6F7   /* page background, light grey */
--color-surface:      #FFFFFF   /* cards, panels, table rows */
--color-border:       #E4E6E8   /* all dividers, input borders */
--color-border-light: #F0F1F2   /* subtle inner separators */

--color-text-primary:   #111213  /* headings, table cell primary */
--color-text-secondary: #6B7280  /* labels, meta, placeholder */
--color-text-disabled:  #B0B5BC  /* inactive, empty states */

--color-accent:         #2D6A4F  /* primary green — buttons, active nav, badges */
--color-accent-light:   #D1EBE0  /* green badge background, hover tint */
--color-accent-hover:   #245A42  /* darker green on hover */

--color-danger:         #DC2626
--color-danger-light:   #FEE2E2
--color-warning:        #D97706
--color-warning-light:  #FEF3C7

--color-sidebar-bg:     #1A1C1E  /* near-black sidebar */
--color-sidebar-text:   #C9CDD2  /* inactive nav items */
--color-sidebar-active: #FFFFFF  /* active nav item text */
--color-sidebar-accent: #2D6A4F  /* active nav item left border + icon tint */
```

### Typography
```
Font family:  'Inter', system-ui, sans-serif
Sizes:        12px (label/meta) | 13px (table cell) | 14px (body) | 16px (section title) | 20px (page title) | 24px (hero)
Weights:      400 (body) | 500 (label, nav item) | 600 (heading, button) | 700 (page title)
Line height:  1.5 body | 1.25 headings
```

### Spacing
```
Base unit: 4px
Scale: 4 | 8 | 12 | 16 | 20 | 24 | 32 | 40 | 48 | 64
```

### Radius & Shadow
```
--radius-sm:  4px   /* badges, chips */
--radius-md:  6px   /* inputs, buttons */
--radius-lg:  8px   /* cards, panels */

--shadow-card: 0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)
--shadow-dropdown: 0 4px 16px rgba(0,0,0,0.10)
```

---

## Layout Structure

### Shell (applies to all pages)

```
┌──────────────┬─────────────────────────────────────────────┐
│              │  Top Bar (64px, white, border-bottom)        │
│  Sidebar     ├─────────────────────────────────────────────┤
│  (240px)     │                                             │
│  dark        │  Page Content                               │
│  fixed       │  (scrollable, bg: --color-bg)               │
│              │                                             │
└──────────────┴─────────────────────────────────────────────┘
```

**Sidebar:**
- Background: `--color-sidebar-bg` (#1A1C1E)
- Top: Logo / app name — white text, 16px bold, 24px padding
- Nav items: 40px height, 16px horizontal padding, 13px medium
  - Inactive: icon + label in `--color-sidebar-text`
  - Active: white text, 3px left green border, subtle `rgba(45,106,79,0.15)` background
  - Hover: `rgba(255,255,255,0.06)` background
- Section dividers: 1px `rgba(255,255,255,0.08)` line with 10px uppercase grey label
- Bottom: user avatar + name + logout — same styling as nav item

**Top Bar:**
- Height: 64px, white background, 1px bottom border `--color-border`
- Left: current page title (16px, 600 weight, `--color-text-primary`)
- Right: search input + notification icon + user avatar chip

**Page Content:**
- Padding: 24px (desktop) / 16px (tablet)
- Max content width: 1200px, centered

---

## S1 — Sidebar Navigation

Restyle the existing navigation to match the shell spec above.

**Nav items to include:**
- Dashboard (home icon)
- Mitglieder (users icon)
- Veranstaltungen (calendar icon)
- Organisationsstruktur (hierarchy icon)
- Verwaltung / Manage (shield icon) — only visible to Organizer/Admin
- Einstellungen (gear icon) — bottom of sidebar

**Acceptance:**
- Active state is unambiguous (green left border, white text)
- Sidebar does not scroll independently on normal-height screens
- Collapsed/mobile: sidebar becomes a hamburger overlay

---

## S2 — Top Bar

Build the persistent top bar with:
- Page title (reflects current route, e.g. "Mitglieder")
- Global search input (grey background, 280px wide, placeholder "Suchen…")
- Bell icon for notifications (no functionality needed, visual only)
- User avatar circle (initials, green background, 32px) with dropdown: Profil / Abmelden

**Acceptance:**
- Top bar stays fixed on scroll
- Search input has focus ring in green

---

## S3 — Card Component

Define a reusable `Card` component used for all content sections:
- White background
- `--radius-lg` border radius
- `--shadow-card`
- 1px border `--color-border`
- Internal padding: 20px

Variants:
- Default (white)
- Flat (no shadow, border only — for nested use)
- Highlighted (green left border 3px — for important info or active state)

**Acceptance:**
- Cards never have colored backgrounds (green/blue fills) — only white
- Cards can have a header row with title (14px, 600) + optional action button top-right

---

## S4 — Data Table

Restyle all tables across the app (member list, event list, registration list):

**Structure:**
- Header row: `--color-bg` background, 12px uppercase labels, `--color-text-secondary`, 500 weight, 44px height, border-bottom
- Data rows: white background, 48px height, 13px `--color-text-primary`, 1px bottom border `--color-border-light`
- Hover: `#F8F9FA` row background
- Selected: `--color-accent-light` background with green left border
- Sticky header on scroll within table container

**Columns:**
- Text cells: left-aligned
- Number/date cells: right-aligned or left per context
- Action column: always rightmost, contains icon buttons (not text links)

**Row actions (appear on hover):**
- Edit: pencil icon, `--color-text-secondary`
- Delete: trash icon, `--color-danger` on hover
- View: eye icon, `--color-text-secondary`

**Pagination:**
- Below table, right-aligned
- "Zeige 1–50 von 134 Mitgliedern" label (grey, 13px)
- Prev / Next buttons + page number chips

**Acceptance:**
- Table is responsive: horizontal scroll below 768px
- Empty state: centered illustration placeholder + "Keine Einträge gefunden" in grey

---

## S5 — Badges & Status Chips

Replace all current colored label badges with this system:

| Type | Background | Text color | Use |
|---|---|---|---|
| Active / Aktiv | `--color-accent-light` | `--color-accent` | Active member, active status |
| Inactive / Inaktiv | `#F3F4F6` | `#6B7280` | Inactive, historical |
| Warning | `--color-warning-light` | `--color-warning` | Pending, attention needed |
| Danger | `--color-danger-light` | `--color-danger` | Cancelled, error |
| Neutral | `#F3F4F6` | `#374151` | OrgUnit level labels, read-only info |

**Specs:**
- Height: 20px
- Padding: 0 8px
- Radius: `--radius-sm` (4px)
- Font: 11px, 600 weight, uppercase for level labels / sentence case for status

**Acceptance:**
- OrgUnit level labels (Hegering, Kreis, etc.) use Neutral style — not 5 different colors
- Active member badge is always green

---

## S6 — Buttons

Define button system:

| Variant | Background | Text | Border | Use |
|---|---|---|---|---|
| Primary | `--color-accent` | white | none | Main CTA: Speichern, Hinzufügen |
| Secondary | white | `--color-text-primary` | `--color-border` | Cancel, secondary action |
| Danger | `--color-danger` | white | none | Delete confirmations |
| Ghost | transparent | `--color-accent` | none | Table row actions, inline |
| Icon | transparent | `--color-text-secondary` | none | Toolbar icon buttons |

**Specs:**
- Height: 36px (default), 32px (small), 40px (large)
- Padding: 0 16px
- Radius: `--radius-md`
- Font: 13px, 600
- Icons in buttons: 16px, 6px gap to label
- Disabled: 50% opacity, no cursor

**Acceptance:**
- No rounded-full pill buttons anywhere
- Hover on Primary: `--color-accent-hover`
- Focus: 2px green outline offset 2px

---

## S7 — Forms & Inputs

All inputs, selects, textareas:

- Height: 36px (single line), auto (textarea)
- Border: 1px solid `--color-border`
- Radius: `--radius-md`
- Background: white
- Padding: 0 12px
- Font: 14px, `--color-text-primary`
- Placeholder: `--color-text-disabled`
- Focus: border color `--color-accent`, no box shadow glow — just the border color change

**Labels:**
- 12px, 500 weight, `--color-text-secondary`
- 6px gap between label and input
- Always above the input, never floating/placeholder-as-label

**Form layout:**
- Two-column grid on desktop (label left 160px fixed, input flex-1) — like a profile form
- OR stacked (label top, input below) for modal forms
- Section grouping: each logical group of fields in a Card with a section title

**Error state:**
- Border: `--color-danger`
- Error message: 12px, `--color-danger`, below the input
- No red background on the input itself

**Acceptance:**
- All existing profile forms, event forms, filter panels use this system
- No floating labels

---

## S8 — Page Header Pattern

Every page has a consistent header block at the top of the content area:

```
┌─────────────────────────────────────────────────┐
│  Page Title (20px, 700)          [Primary Button]│
│  Subtitle / description (14px, grey)             │
└─────────────────────────────────────────────────┘
```

- Padding-bottom: 20px
- Border-bottom: 1px `--color-border`
- Margin-bottom: 24px before first card

**Acceptance:**
- Consistent across: Mitglieder, Veranstaltungen, Organisationsstruktur, Verwaltung/Manage, Profil

---

## S9 — Member List Page (`/mitglieder` and `/manage`)

Apply all the above to the member table page:

- Page header: "Mitglieder" + "Mitglied hinzufügen" primary button
- Filter bar (inside a flat Card, above table):
  - Search input (full text, 300px)
  - OrgUnit dropdown filter
  - Status filter (Aktiv / Inaktiv / Alle)
  - "Filter zurücksetzen" ghost link
- Table with columns: Name, OrgUnit(s), Telefon, E-Mail, Beitrittsdatum, Status — sortable headers
- Row click → opens member detail slide-over panel from the right (not a new page)
- Slide-over panel: 480px wide, white, shadow, shows full member profile in read-only with an "Bearbeiten" button

**Acceptance:**
- No full-page navigation on row click — use slide-over
- Table header columns show sort arrow on hover, filled arrow on active sort

---

## S10 — Organisationsstruktur Page

Apply styling to the OrgUnit tree:

- Replace all current colored level badges with the Neutral chip style (grey, same for all levels — differentiate by label text only: Bund, Land, Region, Kreis, Hegering)
- Tree toggle buttons: simple chevron icon (16px), no box/border
- Row hover: `#F8F9FA` — same as table row hover
- "im Scope" button → secondary button style (white, grey border), opens modal
- Add / Delete actions → icon-only Ghost buttons, appear on hover
- Scope modal → standard modal (white, shadow, backdrop, rounded-lg)

---

## S11 — Modals

Standard modal behavior and styling:

- Backdrop: `rgba(0,0,0,0.40)`, no blur
- Modal panel: white, `--radius-lg`, `--shadow-dropdown`, max-width 480px (default) / 640px (large)
- Header: title (16px, 600) + X close button top-right, 20px padding, border-bottom
- Body: 20px padding, scrollable if content overflows
- Footer: 12px padding-top, border-top, right-aligned buttons (Secondary + Primary)

---

## S12 — Empty States

Standardize all empty states:

- Centered vertically and horizontally in their container
- Simple monochrome icon (40px, `--color-text-disabled`)
- Title: "Noch keine [Einträge]" — 14px, 500, `--color-text-secondary`
- Optional subtext: 13px, `--color-text-disabled`
- Optional CTA button (Primary) if the user can create something

---

## Rollout Order

Apply changes in this order to avoid broken intermediate states:

1. **Tokens** — define all CSS variables globally
2. **Shell** — sidebar + top bar (S1, S2)
3. **Core components** — Card, Button, Badge, Input (S3, S5, S6, S7)
4. **Tables** — S4
5. **Page headers** — S8
6. **Pages** — S9 (members), S10 (org tree), then remaining pages
7. **Modals & empty states** — S11, S12

---

## What to NOT do

- Do not use purple, blue, teal, or orange anywhere in the UI
- Do not use gradient backgrounds on any surface
- Do not use rounded-full (pill) buttons
- Do not use floating/placeholder-as-label inputs
- Do not show colored sidebar items for each nav entry — only green for active, grey for inactive
- Do not add drop shadows to buttons
- Do not use more than one font family