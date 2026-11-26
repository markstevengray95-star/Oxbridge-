# FELLOW · Phase 23 academic interface

## Intent
A calm, credible academic preparation experience: clear information hierarchy, restrained colour, predictable actions and equal usability on mobile and desktop. The redesign changes presentation, **not** admissions scoring, authentication, school permissions or saved preparation.

## Palette and accessibility
| Token | Value | Use |
| --- | --- | --- |
| Academic navy | `#142D3E` | Headings, emphasis, primary actions |
| Muted teal | `#397C80` | Brand accent, outlines, iconography |
| Accessible teal text | `#326D71` | Links and text against ivory |
| Warm ivory | `#F3F1EB` | Main page background |
| White | `#FFFFFF` | Panels and forms |
| Slate ink | `#203340` | Body text |
| Muted text | `#576875` | Labels and descriptions |

Contrast ratios checked by formula (WCAG relative luminance): navy/white 14.24:1; teal/white 4.81:1; accessible teal/ivory 5.22:1; body muted/ivory 5.10:1. For coloured icons, buttons and backgrounds, check the actual adjacent colours. The design never treats colour alone as the only indication of progress, selected answers or a warning.

## Reusable classes (app/fellow-design.css)
- `fellow-ui`: scope the student-facing page background and typography. It is added to the six central areas and to the existing interview and exam session views.
- `fellow-page-header`, `fellow-eyebrow`, `fellow-page-title`, `fellow-description`: heading hierarchy.
- `fellow-panel`, `fellow-tile`, `fellow-soft`: readable surface hierarchy.
- `fellow-hero`, `fellow-primary`, `fellow-secondary`, `fellow-link`: single prominent primary action, appropriate secondary actions.
- `fellow-choice`: selected and keyboard-focused exam/interview configuration.
- `fellow-nav-link`, `fellow-site-nav`, `fellow-mobile-nav`: unified route states.
- `fellow-metrics`: 2-column metrics below 420px with a full-width third statistic.

## Layout rules
Use one page title and one primary CTA per task. Keep records and technical details in native expandable sections. Keep descriptive copy short and meaningful. Prefer consistent spacing and the existing accessible native controls to decorative animation.

Preserve existing URLs, service access checks, persisted keys, question banks and exam/voice session behaviours. Session engines retain their existing internal widgets to avoid regressions; their major surfaces now share the theme. Existing legacy tools inherit the updated global semantic palette, but fine-grained page-by-page redesign is outside this phase.

## Verification
`npm run test:academic-design` checks palette contrast, design system loading, central student routes, responsive/focus/reduced-motion affordances, main session screens and retained functional imports and controls. Full production Next.js build, browser visual checks at 360px/768px/1280px, and live voice/mobile testing remain separate release-gate work.
