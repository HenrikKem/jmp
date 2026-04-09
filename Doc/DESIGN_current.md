# Design System Document: The Editorial Hunter

## 1. Overview & Creative North Star
**Creative North Star: "The Modern Estate"**
This design system moves away from the sterile, "SaaS-blue" dashboard aesthetic. Instead, it draws inspiration from high-end German editorial design and the heritage of the Landesjagdverband NRW. The goal is to create a digital environment that feels like an authoritative, well-organized physical archive—trustworthy, premium, and calm.

To break the "template" look, we utilize **Intentional Asymmetry** and **Tonal Depth**. By avoiding rigid borders and instead using layered surfaces of warm off-white and forest greens, we create a UI that feels organic yet disciplined. It is a "Conservative-Modern" approach: conservative in its reliability and prestige, modern in its use of whitespace and atmospheric layering.

---

## 2. Colors & Surface Philosophy
The palette is rooted in the natural world, utilizing deep coniferous greens and lithic greys to establish immediate institutional authority.

### The "No-Line" Rule
**Prohibit 1px solid borders for sectioning.** Conventional CRMs rely on "boxes within boxes." This system forbids them. Boundaries must be defined solely through:
*   **Background Color Shifts:** A `surface-container-low` section sitting on a `surface` background.
*   **Tonal Transitions:** Using the `surface-container` tiers to denote hierarchy.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of fine heavy-weight paper.
*   **Base:** `surface` (#faf9f5) – The expansive "canvas."
*   **Primary Containers:** `surface-container-low` (#f4f4f0) – Used for large sidebars or secondary content areas.
*   **Focus Areas:** `surface-container-highest` (#e3e2df) – Used for active workspace modules or high-priority data cards.

### The "Glass & Gradient" Rule
To prevent the UI from feeling "flat" or "cheap," use Glassmorphism for floating elements (like navigation overlays or tooltips). 
*   **Backdrop Blur:** Use 12px–20px blur on `surface` colors at 85% opacity.
*   **Signature Textures:** Apply a subtle linear gradient from `primary` (#154212) to `primary-container` (#2D5A27) on main CTAs. This creates a "silk-finish" effect that flat hex codes cannot replicate.

---

## 3. Typography
The typography strategy pairs **Manrope** (geometric, authoritative) for displays with **Inter** (highly legible, neutral) for data-heavy CRM tasks.

*   **Display & Headlines (Manrope):** Used for section titles and "At-a-glance" stats. The wide apertures of Manrope convey a modern, open feeling.
    *   *Example:* `headline-lg` at 2rem provides a clear entry point for users navigating hunter registries.
*   **Body & Labels (Inter):** Chosen for its exceptional readability in dense data tables.
    *   *Example:* `body-md` (0.875rem) is the workhorse for member details and notes.
*   **Hierarchy as Identity:** Use `tertiary` (#393939) for body text to reduce harsh contrast against the warm `surface`, creating a more "editorial" and less "computerized" reading experience.

---

## 4. Elevation & Depth
In this design system, depth is a function of light and layering, not structural lines.

*   **The Layering Principle:** Stack `surface-container-lowest` cards on a `surface-container-low` section to create a soft, natural lift. This mimics the way a document sits on a desk.
*   **Ambient Shadows:** For floating modals, use "Atmospheric Shadows."
    *   **Blur:** 40px - 60px.
    *   **Opacity:** 4% - 6%.
    *   **Color:** Use a tinted version of `on-surface` (#1b1c1a) rather than pure black to keep the shadows feeling "airy."
*   **The "Ghost Border" Fallback:** If a border is required for accessibility (e.g., input fields), use `outline-variant` at 20% opacity. **Never use 100% opaque borders.**

---

## 5. Components

### Buttons
*   **Primary:** High-contrast `primary` (#154212) with `on-primary` text. Use `xl` (0.75rem) roundedness for a sophisticated, approachable feel.
*   **Tertiary:** No background or border. Use `primary` text weight with an icon. These should feel like "inline actions" rather than heavy UI elements.

### Cards & Lists
*   **The Divider Ban:** Do not use line dividers between list items. Use the **Spacing Scale** (e.g., `4` or 1.4rem) to create clear "islands" of information. 
*   **Hover States:** On hover, a card should shift from `surface-container-low` to `surface-container-highest`.

### Input Fields
*   **Styling:** Fields should use `surface-container-lowest` (pure white) backgrounds to pop against the off-white `surface`.
*   **Focus State:** A 2px "glow" using `primary-fixed-dim` (#a1d494) at 30% opacity, rather than a harsh solid line.

### Additional Signature Component: The "Heritage Header"
For individual hunter profiles or association branch pages, use a wide-format header with a subtle gradient-to-transparent overlay using `primary` (#154212). This anchors the page in the brand's core forest green while providing a premium, high-end feel.

---

## 6. Do’s and Don’ts

### Do
*   **DO** use the `12` (4rem) spacing token for margins between major sections to ensure the layout "breathes."
*   **DO** use `secondary` (#526351) for labels and metadata to create a clear visual hierarchy against `primary` titles.
*   **DO** ensure all interactive elements have a minimum touch/click target of 44px, maintaining the "Professional & Accessible" mandate.

### Don't
*   **DON'T** use `error` (#ba1a1a) for anything other than critical destructive actions or system failures. For "caution," use `tertiary` tones.
*   **DON'T** use sharp 0px corners. Always use a minimum of `DEFAULT` (0.25rem) to maintain the "Soft Minimalism" aesthetic.
*   **DON'T** crowd the screen. If a table has more than 8 columns, utilize a "Details" drawer (Glassmorphic) rather than horizontal scrolling.