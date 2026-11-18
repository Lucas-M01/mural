---
name: Premium Productivity System
colors:
  surface: '#13131b'
  surface-dim: '#13131b'
  surface-bright: '#393841'
  surface-container-lowest: '#0d0d15'
  surface-container-low: '#1b1b23'
  surface-container: '#1f1f27'
  surface-container-high: '#292932'
  surface-container-highest: '#34343d'
  on-surface: '#e4e1ed'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#e4e1ed'
  inverse-on-surface: '#303038'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#d0bcff'
  on-secondary: '#3c0091'
  secondary-container: '#571bc1'
  on-secondary-container: '#c4abff'
  tertiary: '#ffb783'
  on-tertiary: '#4f2500'
  tertiary-container: '#d97721'
  on-tertiary-container: '#452000'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#ffdcc5'
  tertiary-fixed-dim: '#ffb783'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#703700'
  background: '#13131b'
  on-background: '#e4e1ed'
  surface-variant: '#34343d'
typography:
  h1:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: '0'
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  caps-xs:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-margin: 1.25rem
  stack-gap: 0.75rem
  inline-gap: 0.5rem
  section-padding: 1.5rem
---

## Brand & Style

This design system is built on the principles of **Precision Minimalism**. It is designed for high-achievers who value focus, clarity, and professional-grade tools. The aesthetic draws heavily from the "Linear" school of thought: high-density information presented with surgical precision, balanced by generous whitespace and subtle depth.

The brand personality is **composed, efficient, and sophisticated**. It avoids unnecessary ornamentation, instead using micro-interactions and refined typography to signal quality. The goal is to reduce cognitive load, transforming a potentially stressful list of tasks into a structured, calm environment for deep work.

## Colors

The color palette is anchored by deep slates and vibrant indigos to create a "Pro-SaaS" atmosphere. 

- **Primary Action:** Used for the main CTA (e.g., "Add Task") and active states. 
- **Surfaces:** In dark mode, surfaces use a slightly lighter slate (#1E293B) to create a subtle lift from the background. 
- **Accent:** Reserved for secondary highlights, subtle gradients, or celebratory "task complete" states.
- **Priority Logic:** High priority uses a muted red, Medium uses a warm amber, and Low uses a soft emerald, all adjusted for legibility against the dark slate surfaces.

## Typography

The typography utilizes **Inter** to achieve a neutral, systematic, and utilitarian feel. 

- **Hierarchy:** Use `h1` for screen titles and `h2` for section headers (e.g., "Today", "Upcoming"). 
- **Task Text:** Task titles should use `body-lg` for readability. 
- **Metadata:** Use `label-sm` for dates, tags, and secondary information. 
- **Uppercase:** Use `caps-xs` sparingly for small category headers or status labels to provide visual contrast without increasing font size.

## Layout & Spacing

This design system employs a **Fluid Grid** model optimized for mobile constraints. 

- **Margins:** A standard 20px (1.25rem) margin is applied to the left and right of the screen.
- **Rhythm:** Elements follow an 8px base unit. Task items are separated by a 12px (`stack-gap`) vertical margin to maintain breathing room between interactive zones.
- **Density:** While the style is minimalist, the layout remains dense enough to allow a power user to see 6-8 tasks on screen at once without scrolling.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** supplemented by **Ambient Shadows**.

1.  **Level 0 (Background):** Solid `#0F172A`.
2.  **Level 1 (Cards/Items):** Solid `#1E293B`. Use a subtle 1px border (`#334155` in dark mode) to define edges rather than heavy shadows.
3.  **Level 2 (Active/Floating):** For elements like the "Add Task" modal or context menus, use a soft, extra-diffused shadow: `0 10px 25px -5px rgba(0, 0, 0, 0.4)`.
4.  **Interaction:** When a task is dragged, increase its elevation by applying a subtle indigo-tinted shadow to indicate it is "lifted" from the surface.

## Shapes

The shape language is defined by **Soft Roundedness (0.5rem base)**. 

- **Tasks & Cards:** Use `rounded-md` (8px) for standard task containers.
- **Buttons:** Use `rounded-lg` (16px) for primary buttons to make them feel more "pressable" and distinct from task cards.
- **Checkboxes:** Use a 4px (small) radius rather than a circle to maintain the precise, architectural feel of the brand.
- **Badges:** Priority badges use a pill shape (fully rounded) to contrast against the more rectangular task cards.

## Components

### Buttons
- **Primary:** Gradient from `#6366F1` to `#8B5CF6`. White text. Subtle inner glow on top edge.
- **Ghost:** Transparent background, `#94A3B8` text. On press, background becomes `rgba(255, 255, 255, 0.05)`.

### Inputs
- **Style:** Understated. No background fill, just a 1px bottom border or a very subtle `#1E293B` container.
- **Animation:** On focus, the border transitions to Primary Indigo, and the label floats upward with a 200ms spring curve.

### Task Cards
- **Structure:** Left-aligned checkbox, center-aligned title/description, right-aligned priority badge.
- **State:** On completion, the card opacity drops to 50%, and the text receives a subtle strike-through.

### Priority Badges
- **High:** Subtle red tint background, bold red text.
- **Medium:** Subtle amber tint background, bold amber text.
- **Low:** Subtle emerald tint background, bold emerald text.
- *Note: Background opacities for badges should stay around 10-15% in dark mode to keep the text legible.*

### Navigation Bar
- A bottom-anchored, translucent blurred bar (Backdrop Filter: blur 20px) with icons for "Inbox," "Search," and "Settings."