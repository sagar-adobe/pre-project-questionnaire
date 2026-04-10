/**
 * Build-time script: reads the Excel file, runs the same parseExcel logic,
 * and writes the result to public/questions.json so the static site can
 * fetch it on the client instead of relying on a Node.js server.
 *
 * Run via:  npx tsx scripts/generate-questions.ts
 * (automatically called by the prebuild / predev npm hooks)
 */

import * as XLSX from 'xlsx'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { Sheet, Category } from '../lib/parseExcel'

// ── Descriptions for built-in questions (keyed by question ID) ───────────────
// These are applied on top of whatever the Excel file provides (Excel wins if non-empty).

const DESCRIPTIONS: Record<string, string> = {
  // ── Project › Project Scope & Goals ──────────────────────────────────────
  'project-0-0': 'Defines the "why" behind the project. Clear objectives align all team members and prevent scope creep throughout development.',
  'project-0-1': 'Understanding your audience shapes every design and technical decision — from font size to API performance requirements.',
  'project-0-2': 'Specific, measurable KPIs keep the project accountable and help prioritize features that move the needle.',
  'project-0-3': 'Greenfield projects have more freedom in architecture; migrations come with constraints (existing data, integrations, URLs) that must be planned for.',
  'project-0-4': 'Migration projects risk losing critical functionality if not documented. List what must stay, what should improve, and what can be cut.',

  // ── Project › UI/UX Requirements & Branding ──────────────────────────────
  'project-1-0': 'Having brand guidelines upfront avoids redesign cycles. Even a basic brand sheet (colors, fonts, logo sizes) is enough to start.',
  'project-1-1': 'Tone guides micro-decisions in typography, spacing, animation speed, and language. "Corporate" means different things to different clients.',
  'project-1-2': 'Knowing what to emulate (or avoid) saves discovery time and aligns expectations before any design work begins.',
  'project-1-3': 'Pixel-perfect Figma handoffs and "build from scratch" are very different scopes. Clarify this early to scope effort accurately.',
  'project-1-4': 'Key user flows are the most important things to get right. Mockups or prototypes here are worth more than a hundred words of description.',
  'project-1-5': 'Mandated libraries (e.g., MUI, Ant Design) affect bundle size, theming approach, and how much custom CSS is needed.',
  'project-1-6': 'Without a clear approval owner, reviews loop endlessly. One named decision-maker keeps the process moving.',
  'project-1-7': 'Empty/error/loading states are often missed in initial designs but are critical to a polished UX. Define them early.',
  'project-1-8': 'Animations can be delightful or disruptive. Confirm specs for duration, easing, and whether reduced-motion users should see a fallback.',
  'project-1-9': 'Placeholder copy affects layout significantly. Know whether real content is coming before building flexible text-overflow handling.',

  // ── Project › Audience & Accessibility ───────────────────────────────────
  'project-2-0': 'Different users have vastly different needs. Internal tools, consumer apps, and children\'s platforms each require tailored accessibility strategies.',
  'project-2-1': 'WCAG 2.1 AA is the baseline for most public-facing sites. Some industries (healthcare, government) require AAA or specific regulations.',
  'project-2-2': 'Keyboard navigation and screen reader support are non-negotiable for most accessibility standards. Confirm scope and testing requirements.',
  'project-2-3': 'Audits catch issues that developers miss. Agree on timing (before launch? after?) and who conducts it (internal QA, third-party tool).',
  'project-2-4': 'WCAG recommends 4.5:1 contrast ratio for normal text and 3:1 for large text. This affects color palette decisions significantly.',
  'project-2-5': 'Missing alt text fails automated accessibility checks and hurts SEO. Confirm who writes alt text — developer, designer, or content team.',
  'project-2-6': 'Users with vestibular disorders can be harmed by parallax or looping animations. The prefers-reduced-motion CSS media query handles this.',
  'project-2-7': 'Accessibility often falls through the cracks when no one owns it. Assign a responsible person before development starts.',

  // ── Project › Features & Functionality ───────────────────────────────────
  'project-3-0': 'A complete feature list prevents mid-sprint surprises. Even rough bullet points are better than discovering missed features in QA.',
  'project-3-1': 'Complex components (drag-and-drop, rich text editors, virtual scroll tables) require significantly more time than simple ones. Flag them early.',
  'project-3-2': 'Payment gateway integration can take weeks depending on the provider. Each gateway has its own checkout flow, redirect logic, and webhook setup.',
  'project-3-3': 'Social logins reduce registration friction but require OAuth app setup per provider. Each provider (Google, Facebook, Apple) has its own review process.',
  'project-3-4': 'Real-time features (WebSockets, SSE) require backend infrastructure changes and affect how the frontend manages state and reconnections.',
  'project-3-5': 'A clear must-have vs. nice-to-have split protects the launch date. Everything tends to be "must-have" until you apply this filter.',
  'project-3-6': 'Role-based UI means conditional rendering throughout the app. Know the roles early to plan routing, guards, and component variants.',
  'project-3-7': 'Client-side error handling is often an afterthought. Agree on patterns (toast notifications, inline messages, retry buttons) before building.',
  'project-3-8': 'Existing analytics data reveals which features actually get used. It\'s often the most objective source of truth for prioritization.',

  // ── Project › Content Strategy & CMS ─────────────────────────────────────
  'project-4-0': 'CMS integration fundamentally changes the data-fetching architecture. Whether content comes from AEM APIs, Magento GraphQL, or a headless CMS affects every page component.',
  'project-4-1': 'Page templates and component models define what the CMS editor can control. This affects frontend component granularity.',
  'project-4-2': 'If initial content isn\'t ready, you\'ll be building with Lorem Ipsum, which leads to layout surprises when real content arrives.',
  'project-4-3': 'Web images should be compressed and appropriately sized. WebP format with fallback provides the best balance of quality and file size.',
  'project-4-4': 'Content migrations are frequently underestimated. Old content rarely maps cleanly to new data models — budget time for transformation logic.',
  'project-4-5': 'i18n in a CMS requires translation workflows, locale-specific URL structures, and sometimes different component content per locale.',
  'project-4-6': 'CMS editors who aren\'t developers need an intuitive editing UI. If they need custom tools, that\'s a separate dev effort.',

  // ── Project › API & Integration ───────────────────────────────────────────
  'project-5-0': 'A clear API inventory prevents frontend blockers. Without knowing what endpoints exist, the frontend can\'t be properly built or estimated.',
  'project-5-1': 'Swagger/OpenAPI specs allow frontend developers to understand request/response shapes without relying on constant backend availability.',
  'project-5-2': 'Auth strategy affects every API call. JWT tokens need refresh logic; cookies need CORS configuration; OAuth needs redirect handling.',
  'project-5-3': 'Understanding the JSON schema helps design the data layer. Nested vs flat structures significantly affect how components receive and transform data.',
  'project-5-4': 'Rate limits require client-side throttling or retry logic. Pagination affects how lists are displayed and loaded.',
  'project-5-5': 'Inconsistent error formats from the API mean the frontend must handle each case differently. Standardizing early saves significant defensive coding.',
  'project-5-6': 'Third-party integrations (Stripe, Google Maps, etc.) each have their own auth, SDK, and error model. Budget time per integration.',
  'project-5-7': 'WebSocket connections require reconnection logic, heartbeat handling, and state reconciliation — significantly more complex than REST.',
  'project-5-8': 'API changes during migration are a major risk. Understand what\'s staying, what\'s changing, and what deprecation timeline exists.',

  // ── Project › Performance & Optimization ─────────────────────────────────
  'project-6-0': 'Without targets, performance is subjective. Lighthouse score of 90+, LCP under 2.5s, and CLS under 0.1 are industry-standard baselines.',
  'project-6-1': 'SSR dramatically improves Time to First Byte and SEO. Static generation (SSG) is even faster for content that doesn\'t change per user.',
  'project-6-2': 'Lazy loading images below the fold can reduce initial page load by 50%+ on image-heavy pages.',
  'project-6-3': 'A CDN reduces latency by serving assets from edge nodes close to the user. Critical for global audiences.',
  'project-6-4': 'Brotli compression typically reduces text asset sizes 15–25% more than gzip. Tree-shaking and code splitting reduce bundle size.',
  'project-6-5': 'Service workers enable offline support and background sync. HTTP caching headers prevent unnecessary re-downloads of unchanged assets.',
  'project-6-6': 'Traffic estimates inform decisions about data fetching strategies, API caching, and whether client-side state can be kept in memory.',
  'project-6-7': 'RUM (Real User Monitoring) tools like SpeedCurve or Datadog measure real-world performance, not just lab scores.',

  // ── Project › SEO & Marketing Requirements ───────────────────────────────
  'project-7-0': 'Each page ideally has a unique title and meta description. Without clear ownership, this gets skipped and SEO suffers.',
  'project-7-1': 'Semantic HTML (h1 hierarchy, nav landmarks, main content area) is foundational for both SEO and accessibility.',
  'project-7-2': 'An XML sitemap helps search engines discover all pages. robots.txt controls what gets indexed or excluded.',
  'project-7-3': 'SPAs built without SSR/prerendering may not be indexed by Google. Verify the SEO strategy for client-rendered content.',
  'project-7-4': 'Open Graph tags control how links appear when shared on Twitter, LinkedIn, Slack, etc. — title, description, and preview image.',
  'project-7-5': 'Analytics setup is often left until the last minute. Decide upfront who configures GTM, GA4, or other tools.',
  'project-7-6': 'Custom event tracking (button clicks, form submissions, video plays) must be specified before implementation — retrofitting is error-prone.',
  'project-7-7': 'GDPR/CCPA require explicit user consent before tracking cookies fire. Implementing consent banners is a feature in itself.',
  'project-7-8': 'Analytics in test environments need care to avoid polluting production data. Use debug mode or separate GA properties for testing.',

  // ── Project › Browser, Device & Responsiveness ───────────────────────────
  'project-8-0': 'Browser support matrix directly affects what CSS, JS, and Web APIs can be used without polyfills.',
  'project-8-1': 'IE11 support adds significant overhead (no CSS Grid, no flexbox gap, no ES modules). It\'s worth explicitly confirming if needed.',
  'project-8-2': 'Mobile-first development is standard. Knowing target devices early helps define breakpoints and touch interaction patterns.',
  'project-8-3': 'Defined breakpoints prevent inconsistent responsive behavior. Common breakpoints: 320, 480, 768, 1024, 1280, 1440px.',
  'project-8-4': 'Mobile traffic often exceeds 70% for consumer-facing apps. Test on real devices, not just browser DevTools emulation.',
  'project-8-5': 'Touch targets should be at least 44×44px (Apple HIG) to prevent mis-taps. Hover-only interactions don\'t work on touch screens.',
  'project-8-6': 'iOS and Android have different navigation conventions (back button behavior, safe areas, font rendering). Design for both explicitly.',
  'project-8-7': 'Offline states should show a clear message rather than a broken UI. Service workers can cache critical resources for offline use.',

  // ── Project › Analytics & Tracking ───────────────────────────────────────
  'project-9-0': 'Different tools serve different purposes: GA4 for traffic, Hotjar for heatmaps, Mixpanel for product analytics. Confirm which are needed.',
  'project-9-1': 'Tracking IDs must be environment-specific (dev/staging/prod). Sharing production IDs across environments pollutes analytics data.',
  'project-9-2': 'Event taxonomy should be agreed upfront. Inconsistent event naming across features makes data analysis difficult.',
  'project-9-3': 'E-commerce tracking (enhanced ecommerce, conversion funnels) requires specific dataLayer pushes that must be planned in the component design.',
  'project-9-4': 'Use GTM\'s Preview mode or browser extensions like GA Debugger to verify tracking fires correctly before launch.',
  'project-9-5': 'Existing dashboards clarify what data is already being captured and what gaps need to be filled.',

  // ── Project › Localization & Internationalization ─────────────────────────
  'project-10-0': 'i18n architecture (React-Intl, next-i18next, etc.) is very hard to retrofit. It must be planned from the start if multiple locales are needed.',
  'project-10-1': 'JSON translation files work well for small projects. Larger projects need a TMS (translation management system) like Phrase or Lokalise.',
  'project-10-2': 'RTL support requires layout mirroring. CSS logical properties (margin-inline-start instead of margin-left) simplify RTL handling.',
  'project-10-3': 'date-fns or Intl.DateTimeFormat handle locale-specific formatting. Currency and number formats also vary significantly by locale.',
  'project-10-4': 'Dynamic locale switching without reload requires all text to come from the i18n layer — hardcoded strings break it.',
  'project-10-5': 'Translation workflows need coordination between developers, content managers, and translators. Missing translations should show fallback text, not break the UI.',

  // ── Project › Deployment, Environments & Maintenance ─────────────────────
  'project-11-0': 'Environment parity reduces "works on my machine" issues. Know who can deploy to each environment and what access is needed.',
  'project-11-1': 'CI/CD pipelines prevent manual deployment errors. Define the branching strategy (GitFlow, trunk-based) and who approves merges.',
  'project-11-2': 'Hosting choice affects config: Vercel for Next.js, AWS for custom, Docker for containerized. Each has different deployment workflows.',
  'project-11-3': 'DNS changes can take up to 48h to propagate. SSL provisioning via Let\'s Encrypt or ACM needs to happen before go-live.',
  'project-11-4': 'Automated deployments on merge to main are the gold standard. Manual deployments introduce human error and deployment anxiety.',
  'project-11-5': 'A rollback plan is essential. Whether that\'s reverting a deploy, feature-flagging off a bad release, or hotfixing, define the process upfront.',
  'project-11-6': 'Post-launch support ownership is often unclear. Define SLAs, communication channels, and who triages production issues.',
  'project-11-7': 'Running old and new systems in parallel (strangler-fig pattern) reduces risk but requires traffic routing and session handling between systems.',

  // ── Project › Timeline, Process & Communication ───────────────────────────
  'project-12-0': 'Hard deadlines (product launches, trade shows, contractual dates) constrain scope. Know them before estimating.',
  'project-12-1': 'Milestones like design freeze prevent design changes after frontend development has started, which causes costly rework.',
  'project-12-2': 'Misaligned communication channels create lost context. Agree on a single place for decisions and another for async updates.',
  'project-12-3': 'Weekly demos keep stakeholders engaged and surface misalignments early, when they\'re cheap to fix.',
  'project-12-4': 'When too many people have approval power, nothing gets approved. Identify one decision-maker per area.',
  'project-12-5': 'Slow feedback loops are a leading cause of delays. A 48-hour SLA for feedback is a reasonable baseline.',
  'project-12-6': 'Unclear ownership of code quality, testing, and bug fixes leads to finger-pointing. Write it down before the project starts.',
  'project-12-7': 'ESLint, Prettier, and editor config (.editorconfig) enforce consistency. Agree on rules before writing the first line of code.',
  'project-12-8': 'Living documentation in tickets/user stories is more useful than waterfall specs. Agree on the format and where it lives.',
  'project-12-9': 'Changes after development starts are expensive. A formal change request process (even lightweight) prevents scope creep.',

  // ── Project › Data Privacy & Security ────────────────────────────────────
  'project-13-0': 'Data minimization is a GDPR principle: only collect what you need. Know what\'s collected to design appropriate consent flows and storage.',
  'project-13-1': 'GDPR applies to EU users regardless of where the company is based. HIPAA applies to health data. PCI to payment data. Know which apply.',
  'project-13-2': 'Sensitive data in localStorage or sessionStorage is readable by any JS on the page. Use httpOnly cookies for auth tokens.',
  'project-13-3': 'Auth flows (especially MFA, OAuth, and password reset) are complex and security-critical. Use a proven library rather than rolling your own.',
  'project-13-4': 'CAPTCHA (reCAPTCHA, Turnstile) and login rate limiting protect against brute-force attacks. These are backend concerns but affect frontend UX.',
  'project-13-5': 'A responsible disclosure process (security.txt, CVE reporting) lets researchers report vulnerabilities safely. Define this before launch.',

  // ── Design › Typography ───────────────────────────────────────────────────
  'design-0-0': 'Font fallbacks prevent layout shifts when custom fonts fail to load. System font stacks (Georgia, Arial) ensure readable text in all conditions.',
  'design-0-1': 'Responsive font sizes using clamp() or viewport units scale smoothly across screen sizes without breakpoint-specific overrides.',
  'design-0-2': 'Line height affects readability. Body text typically needs 1.4–1.6 line height. Too tight causes eye fatigue; too loose breaks visual grouping.',
  'design-0-3': 'CSS text-transform (uppercase, capitalize) should be applied via CSS, not hardcoded in HTML, so text remains copyable and translatable.',
  'design-0-4': 'HTML heading hierarchy (h1 → h6) affects SEO and accessibility. The visual style and the semantic level should not be conflated.',
  'design-0-5': 'Design tokens for typography ensure consistency. Custom values that aren\'t tokenized tend to proliferate and cause inconsistency over time.',
  'design-0-6': 'Long translated text often exceeds the original English by 30–40%. Components must handle text overflow gracefully with ellipsis or wrapping.',

  // ── Design › Color and Theme ──────────────────────────────────────────────
  'design-1-0': 'CSS custom properties (variables) make theme changes trivial. Hardcoded hex values throughout the codebase make theming a nightmare.',
  'design-1-1': 'Semantic color roles (primary, error, surface) decouple meaning from specific values. This is the foundation for theming and dark mode.',
  'design-1-2': 'Dark mode requires more than inverting colors. Background hierarchy, shadow visibility, and image brightness all need redesign.',
  'design-1-3': 'Interactive states (hover, active, focus) are critical for usability. If they\'re not in the design, developers will guess — often incorrectly.',
  'design-1-4': 'WCAG AA requires 4.5:1 contrast for normal text and 3:1 for large text. Automated tools like axe-core catch most violations.',
  'design-1-5': 'CSS gradients need specific angle, color stop positions, and browser prefixes. Vague descriptions ("blue to purple") lead to mismatches.',
  'design-1-6': 'RGBA colors and opacity need to be specified precisely. rgba(0,0,0,0.5) and a 50% opacity layer behave differently in compositing.',

  // ── Design › Layout and Spacing ───────────────────────────────────────────
  'design-2-0': 'A 12-column grid maps naturally to common screen proportions and allows 1, 2, 3, 4, and 6-column layouts without breaking the grid.',
  'design-2-1': 'An 8px base spacing unit creates visual harmony. All margins, padding, and gaps should be multiples of this unit for consistency.',
  'design-2-2': 'Max-width containers (typically 1200–1440px) prevent content from becoming too wide on large screens. Center-align with horizontal padding.',
  'design-2-3': 'On retina screens, a CSS 1px border renders as 2 physical pixels. True hairlines require 0.5px or transform tricks on iOS.',
  'design-2-4': 'Absolutely positioned overlays and modals need z-index management. Establish a z-index scale early to prevent stacking order conflicts.',
  'design-2-5': 'Off-grid custom values are technical debt. If a designer uses 13px padding, ask if 12px (or 16px) achieves the same visual result.',
  'design-2-6': 'Off-screen elements (drawers, dropdowns) should be truly hidden (display:none or inert attribute) to prevent screen readers from reading hidden content.',

  // ── Design › Responsiveness and Breakpoints ───────────────────────────────
  'design-3-0': 'Mobile-first breakpoints (min-width) are preferable to desktop-down (max-width) as they build complexity incrementally.',
  'design-3-1': 'Fluid layouts using percentages and max-width are lower maintenance than breakpoint-heavy designs. Confirm the approach upfront.',
  'design-3-2': 'Navigation is the most impactful responsive change. Hamburger menus need animation specs, overlay behavior, and focus management.',
  'design-3-3': 'Fluid type scaling with clamp(min, preferred, max) eliminates most breakpoint-based font size overrides.',
  'design-3-4': 'Images without size constraints can stretch or squish unpredictably. Use the aspect-ratio CSS property to maintain proportions.',
  'design-3-5': 'iOS Safari adds safe area insets for the notch and home indicator. Use env(safe-area-inset-*) CSS variables to avoid overlap.',
  'design-3-6': 'Touch-only interactions (swipe, long-press) need explicit fallbacks for mouse/keyboard users. Pointer events API can distinguish input types.',

  // ── Design › Components & States ─────────────────────────────────────────
  'design-4-0': 'Missing states are the most common design-to-development gap. A component without hover/focus/disabled states is incomplete.',
  'design-4-1': 'Visual state specifications prevent guesswork. "Slightly darker on hover" is ambiguous — specify the exact color or darken percentage.',
  'design-4-2': 'Empty states are a UX opportunity. A thoughtful empty state (illustration + call-to-action) is better than a blank area.',
  'design-4-3': 'Inline validation (per-field) vs. summary errors (on submit) are different UX patterns. Decide which to use and be consistent.',
  'design-4-4': 'Success states (confirmation toasts, green checkmarks) complete the user\'s mental model of an action. Don\'t skip them.',
  'design-4-5': 'Focus indicators are mandatory for keyboard accessibility. The default browser outline is often removed by CSS resets and must be replaced.',
  'design-4-6': 'Toggle components must visually distinguish their two states. Relying only on position (e.g., a switch) can be unclear without a label.',
  'design-4-7': 'Skeleton loaders (grey placeholder shapes) reduce perceived load time better than spinners for content-heavy layouts.',

  // ── Design › Design Tokens / Variables ───────────────────────────────────
  'design-5-0': 'Design tokens as the source of truth (Figma tokens → Style Dictionary → CSS variables) enable design-dev sync without manual translation.',
  'design-5-1': 'CSS custom properties scoped to :root are the simplest way to implement tokens. Theme switching becomes a class toggle on the html element.',
  'design-5-2': 'rem-based sizing scales with user browser font preferences (accessibility). px values are fixed and ignore user preferences.',
  'design-5-3': 'Versioned design tokens with a changelog prevent silent breakages. Communicate token changes through the same channel as code changes.',

  // ── Design › Icons and Images ─────────────────────────────────────────────
  'design-6-0': 'SVG icons scale infinitely, support currentColor, and add no HTTP requests when inlined. Prefer SVG over icon fonts or raster for UI icons.',
  'design-6-1': 'Retina displays (@2x, @3x) require higher-resolution images. Use srcset or CSS image-set to serve the right size per device.',
  'design-6-2': 'Images without size constraints cause layout shifts (Cumulative Layout Shift). Set explicit width and height attributes to reserve space.',
  'design-6-3': 'currentColor SVGs inherit the parent\'s text color, making them easy to theme. Multi-color icons need explicit fill values.',
  'design-6-4': 'A consistent asset delivery method (Figma export, shared design system package, or CDN folder) prevents confusion about which version to use.',
  'design-6-5': 'Logos on transparent backgrounds work on any background color. White-background logos require a specific background context to display correctly.',
  'design-6-6': 'Purely decorative images (backgrounds, flourishes) should use aria-hidden="true" or empty alt. Informational images need descriptive alt text.',

  // ── Design › Interactions & Animations ───────────────────────────────────
  'design-7-0': 'Interaction specs prevent frontend developers from guessing behavior. "Clicking this button does X" is the minimum useful spec.',
  'design-7-1': 'Click-outside-to-close is standard UX for dropdowns and modals. Confirm it\'s expected and whether ESC also closes the element.',
  'design-7-2': 'Toggled state changes (play → pause, like → liked) need both states designed. The active state is often forgotten.',
  'design-7-3': 'Animation timing: 150–300ms feels snappy, 300–500ms feels smooth, 500ms+ feels slow. Use ease-out for entrances, ease-in for exits.',
  'design-7-4': 'Auto-playing carousels distract users and fail accessibility guidelines. If auto-play is required, include a pause control.',
  'design-7-5': 'Loading spinners should inherit the brand color and have a consistent size. Specify the animation speed (0.8–1.2s per rotation).',
  'design-7-6': 'Touch gestures (swipe, pinch) need threshold values to avoid accidental triggers. They must not conflict with system-level gestures.',

  // ── Design › Accessibility ────────────────────────────────────────────────
  'design-8-0': 'Decorative icons should have aria-hidden="true" to avoid cluttering screen reader output. Functional icons need an aria-label.',
  'design-8-1': 'Visible labels are preferred over placeholder text (which disappears on input). Icon-only buttons need aria-label for screen readers.',
  'design-8-2': 'Custom focus styles should be at least as visible as the default browser outline. 2px solid outline with 2px offset is a reliable baseline.',
  'design-8-3': 'Use a contrast checker tool (axe, Lighthouse, or the browser devtools accessibility panel) to verify all text meets WCAG AA standards.',
  'design-8-4': 'role="alert" and aria-live="polite" let screen readers announce dynamic content changes. Critical for form errors and toast notifications.',
  'design-8-5': 'Parallax, looping animations, and flashing content can trigger vestibular disorders. Always support the prefers-reduced-motion media query.',
  'design-8-6': 'RTL support requires layout mirroring for most UI elements (text, icons, navigation flow) but not all (phone numbers, prices, media controls).',

  // ── Design › Assets & Export ──────────────────────────────────────────────
  'design-9-0': 'A clear asset handoff process prevents version confusion. Figma exports → shared drive, versioned with component names, is a reliable workflow.',
  'design-9-1': 'WebP with JPEG/PNG fallback is the modern standard. SVG for icons and illustrations. AVIF for maximum compression where supported.',
  'design-9-2': 'Custom fonts need licensing for web use. Google Fonts is free; commercial fonts may require a web license separate from the desktop license.',
  'design-9-3': 'Art-directed responsive images (different crops per breakpoint) use the <picture> element with multiple source elements.',
  'design-9-4': 'Consistent asset naming (kebab-case, descriptive) prevents confusion. icon-arrow-right.svg is clearer than arrow2-final-v3.svg.',
  'design-9-5': 'FontAwesome and similar icon libraries add significant bundle size if not tree-shaken. SVG sprites or individual imports are more efficient.',
  'design-9-6': 'Lottie animations are JSON files that play in the browser. Videos need format choices (MP4/WebM) and autoplay policies clarified.',

  // ── Design › Platform-Specific ───────────────────────────────────────────
  'design-10-0': 'Web, iOS, and Android each have platform conventions (navigation patterns, typography scales, interaction models) that users expect.',
  'design-10-1': 'Bottom navigation is standard on mobile (iOS/Android); top navigation is standard on desktop. Users notice when conventions are violated.',
  'design-10-2': 'Legacy browser limitations (older Chromium on Android, Safari on older iOS) often surprise developers who only test on latest Chrome.',
  'design-10-3': '44×44pt touch targets (Apple HIG) and 48×48dp (Material Design) prevent accidental taps on small screens.',
  'design-10-4': 'Electron apps need to account for system window controls, DPI scaling (especially on Windows), and menu bar integration.',
  'design-10-5': 'App store icons need multiple sizes. Generating them from a single SVG source is the most efficient approach.',

  // ── Design › QA-Level Checklist ───────────────────────────────────────────
  'design-11-0': 'Pixel-perfect implementation requires a side-by-side comparison tool. Browser extensions like PixelParallel or Figma\'s inspect panel help verify exact values.',
  'design-11-1': 'State coverage in QA: manually test hover/focus/active/loading/error/success for every interactive component before marking it done.',
  'design-11-2': 'Placeholder images in production are a common oversight. Search for common placeholder services (via.placeholder.com, picsum.photos) before launch.',
  'design-11-3': 'Run axe DevTools or Lighthouse accessibility audit as part of the definition of done — not as a last-minute check.',
  'design-11-4': 'Design files get updated during development. Always confirm you\'re building from the latest approved version, not an earlier draft.',
  'design-11-5': 'Error and empty states are frequently skipped in QA. Test them explicitly: disconnect from the network, submit invalid data, clear all content.',
  'design-11-6': 'Test on real devices, not just browser emulation. iOS Safari and Chrome on Android render differently from desktop Chrome DevTools.',
  'design-11-7': 'UI bugs like misaligned items compound: one 1px error causes a cascade across the layout. Use browser zoom (125%, 150%) to surface subpixel issues.',
  'design-11-8': 'German and Finnish translations can be 40–50% longer than English. Test all UI elements with the longest expected translation.',
  'design-11-9': 'Design-dev discrepancy review (redline comparison) catches inconsistencies that developers introduce unintentionally. Include it in the QA definition of done.',

  // ── Backend › APIs & Data Endpoints ──────────────────────────────────────
  'backend-0-0': 'A complete API inventory prevents frontend blockers. Without knowing what endpoints exist, frontend work cannot be properly estimated or started.',
  'backend-0-1': 'REST and GraphQL have very different data-fetching patterns. GraphQL enables precise data fetching but requires a different caching strategy.',
  'backend-0-2': 'API documentation is the contract between frontend and backend. OpenAPI specs enable code generation (openapi-typescript) and mock server creation.',
  'backend-0-3': 'Client-side caching strategies (React Query, SWR, Apollo) reduce redundant API calls. Decide the caching approach before building the data layer.',
  'backend-0-4': 'API versioning (v1/v2 in URL vs Accept header) affects how the frontend handles backward compatibility during migrations.',
  'backend-0-5': 'Pagination patterns (offset-based, cursor-based) affect infinite scroll vs. numbered pages UI. Cursor-based pagination is more performant for large datasets.',
  'backend-0-6': 'Bulk export endpoints (CSV, Excel) are often needed for admin features. They have different performance characteristics than standard REST endpoints.',

  // ── Backend › Authentication & Authorization ──────────────────────────────
  'backend-1-0': 'Auth mechanism determines the entire security architecture. JWT requires token refresh logic; session cookies need CSRF protection; OAuth needs redirect handling.',
  'backend-1-1': 'Permissions affect what components render, what API calls succeed, and what routes are accessible. Role definitions must be finalized before building guards.',
  'backend-1-2': 'httpOnly cookies are inaccessible to JavaScript (preventing XSS theft). localStorage tokens are convenient but vulnerable to XSS attacks.',
  'backend-1-3': 'SSO dramatically simplifies user experience in enterprise apps. Each identity provider (Okta, Azure AD) has its own OAuth2/SAML implementation quirks.',
  'backend-1-4': 'CAPTCHA (reCAPTCHA v3, Cloudflare Turnstile) adds server-side verification to login. MFA (TOTP, SMS) adds a second authentication factor.',
  'backend-1-5': 'Password reset flows require secure token generation, expiry handling, and email delivery. These are security-critical and should use proven libraries.',

  // ── Backend › Backend Infrastructure & Data Storage ──────────────────────
  'backend-2-0': 'Database technology affects query patterns and data structures. SQL schemas are rigid but well-suited to relational data; NoSQL is flexible but requires careful modeling.',
  'backend-2-1': 'AEM and Magento can serve content via REST/GraphQL APIs (headless) or render HTML pages (traditional). The approach fundamentally changes the frontend architecture.',
  'backend-2-2': 'Redis caching can reduce API response times from 200ms to 5ms for frequently accessed data. Know what\'s cached and what the invalidation strategy is.',
  'backend-2-3': 'Asset delivery via CDN (Cloudinary, Imgix, AWS CloudFront) provides automatic image optimization and global edge caching.',
  'backend-2-4': 'ERP sync jobs can cause periods of data inconsistency. The frontend needs to handle stale data gracefully (loading states, refresh prompts).',
  'backend-2-5': 'Cache invalidation is one of the hardest problems in computing. Understand the strategy (TTL, event-based, manual purge) and its implications for data freshness.',

  // ── Backend › Third-Party Services & Libraries ────────────────────────────
  'backend-3-0': 'Third-party integrations (Stripe, SendGrid, Twilio) each have their own auth patterns, webhook setups, and error handling requirements.',
  'backend-3-1': 'API keys and secrets must be stored in environment variables, never committed to the repository. Confirm who provisions them per environment.',
  'backend-3-2': 'Official SDKs abstract away API complexities but add bundle size. Evaluate whether raw API calls are sufficient for simple integrations.',
  'backend-3-3': 'Rate limits require exponential backoff retry logic on the frontend. Hitting limits in production causes user-visible errors.',
  'backend-3-4': 'GPL-licensed libraries in a commercial product can have legal implications. Confirm with legal if using any copyleft-licensed dependencies.',
  'backend-3-5': 'Internal security policies often ban packages with known CVEs or certain licenses. Check with the security team before introducing new dependencies.',

  // ── Backend › Error Handling & Logging ───────────────────────────────────
  'backend-4-0': 'A consistent error response structure (code, message, details) makes frontend error handling generic rather than per-endpoint custom logic.',
  'backend-4-1': 'Error classification matters for UX: validation errors (user\'s fault) show inline; server errors (our fault) show a generic message with a retry option.',
  'backend-4-2': 'React Error Boundaries catch render errors but not async errors. A global error page design handles uncaught exceptions gracefully.',
  'backend-4-3': 'Sentry provides real-time error tracking with stack traces and user context. Configure source maps to get meaningful line numbers in minified production code.',
  'backend-4-4': 'Frontend errors (JS exceptions, network failures) should be logged to the same observability platform as backend errors for correlated debugging.',
  'backend-4-5': 'On-call escalation policies and incident runbooks should exist before launch. A production outage is not the time to figure out who to call.',
  'backend-4-6': 'Known bugs in the legacy system are likely to resurface during migration. Document them upfront to distinguish "new bug" from "existing behavior".',

  // ── Backend › Performance & Scalability ───────────────────────────────────
  'backend-5-0': 'Traffic patterns (steady vs. bursty, peak hours) inform caching strategies and auto-scaling configuration.',
  'backend-5-1': 'Load balancing configuration affects sticky sessions. If sessions aren\'t shared across instances, users get logged out on load balancer failover.',
  'backend-5-2': 'Heavy batch jobs running during peak hours degrade API performance. Schedule them during off-peak windows or use background queues.',
  'backend-5-3': 'SLAs define acceptable downtime and response time thresholds. These drive decisions about redundancy, failover, and monitoring alert thresholds.',
  'backend-5-4': 'API response compression (gzip, Brotli) reduces bandwidth for large payloads. Most modern servers support it with a single config line.',
  'backend-5-5': 'Virtual scrolling renders only visible rows in large lists, reducing DOM nodes from thousands to dozens. TanStack Virtual implements this pattern.',

  // ── Backend › Security & Compliance ──────────────────────────────────────
  'backend-6-0': 'CORS misconfiguration is a common security vulnerability. Allowlist specific origins rather than using wildcard (*) in production.',
  'backend-6-1': 'Content Security Policy (CSP) headers prevent XSS by whitelisting allowed script sources. Report-only mode lets you test without breaking anything.',
  'backend-6-2': 'Server-side validation is mandatory regardless of client-side validation. Never trust user input.',
  'backend-6-3': 'Google reCAPTCHA v3 works invisibly (no puzzle) but requires backend score evaluation. Cloudflare Turnstile is a privacy-respecting alternative.',
  'backend-6-4': 'HSTS forces HTTPS for a specified duration. X-Frame-Options (or CSP frame-ancestors) prevents clickjacking. These are standard baseline headers.',
  'backend-6-5': 'Penetration tests typically find issues with input validation, authentication, and authorization logic. Schedule them before launch, not after.',

  // ── Backend › Deployment & Environment Setup ──────────────────────────────
  'backend-7-0': 'Frontend environment variables exposed via NEXT_PUBLIC_* are baked into the build. Never use them for secrets — they\'re visible in the browser source.',
  'backend-7-1': 'CI/CD on git push eliminates manual deployment steps and human error. GitHub Actions, GitLab CI, and Bitbucket Pipelines are common choices.',
  'backend-7-2': 'Separate staging databases prevent test data from polluting production. Staging should mirror production schema but with anonymized data.',
  'backend-7-3': 'Docker containers ensure environment parity between developer machines, CI, and production. Dockerfile and docker-compose.yml belong in the repo.',
  'backend-7-4': 'Locking Node.js versions in .nvmrc and CI config prevents subtle incompatibilities between developers and build servers.',
  'backend-7-5': 'ESLint + Prettier enforced in pre-commit hooks (via Husky + lint-staged) and CI catches style and quality issues before code review.',

  // ── Other › Testing & QA ─────────────────────────────────────────────────
  'other-0-0': 'Unit tests verify logic, integration tests verify component interactions, E2E tests verify user flows. All three layers are needed for a robust suite.',
  'other-0-1': 'Existing test suites reveal what\'s already covered and what patterns to follow. If there are no tests, agree on the minimum coverage before starting.',
  'other-0-2': 'Consistent test data prevents flaky tests. A seeded test database or MSW (Mock Service Worker) API mocks provide reliable, repeatable test conditions.',
  'other-0-3': 'A defined defect lifecycle (discovered → assigned → fixed → verified → closed) prevents bugs from getting lost or duplicated.',
  'other-0-4': 'Acceptance criteria define "done". Without them, features get reopened repeatedly based on subjective interpretation.',
  'other-0-5': 'BrowserStack or LambdaTest provide cloud device farms for cross-browser/device testing without maintaining a physical device lab.',
  'other-0-6': 'Load tests simulate concurrent users to find bottlenecks before launch. k6, Locust, or JMeter are common tools. Test against production-like data volumes.',

  // ── Other › Documentation & Versioning ───────────────────────────────────
  'other-1-0': 'Confluence/Notion for decision records, README for setup instructions, and JSDoc/TSDoc in code for API documentation serve different audiences.',
  'other-1-1': 'Storybook serves as living component documentation. API/endpoint changes should be documented in the same PR as the code change.',
  'other-1-2': 'Breaking changes (API shape changes, removed features) need advance notice. Semantic versioning (MAJOR.MINOR.PATCH) communicates impact level.',
  'other-1-3': 'User-facing changelogs help support teams answer "what changed?" questions. CHANGELOG.md tracking technical changes benefits internal teams.',
  'other-1-4': 'Required reviewers, minimum approvals, and automated checks (CI green, no conflicts) define code review quality gates.',

  // ── Other › Legacy/Migration Considerations ───────────────────────────────
  'other-2-0': 'The current stack\'s versions determine what APIs, patterns, and constraints exist. AEM 6.5 vs AEM as Cloud Service have fundamentally different component models.',
  'other-2-1': 'Data transformation scripts (ETL) for migration need testing with production-like data volumes. Data quality issues in the old system often surface here.',
  'other-2-2': 'Documenting deprecated features prevents them from being accidentally re-implemented. A deprecation notice with a migration path helps the team.',
  'other-2-3': 'Legacy API compatibility during transition (strangler-fig pattern) allows gradual migration without a big-bang cutover.',
  'other-2-4': 'The original developers are invaluable resources for undocumented behavior and tribal knowledge. Identify them early before they move on.',
  'other-2-5': 'Feature parity testing requires a side-by-side comparison checklist. Automated regression tests against the old system capture behavior before it\'s deleted.',
}

// ── Inline the extra questions (mirrors parseExcel.ts) ───────────────────────

const EXTRA_QUESTIONS = {
  sheet: 'Project',
  category: 'Frontend Setup & Tooling',
  questions: [
    {
      question: 'Is TypeScript required? What strictness level is expected (strict, noImplicitAny, etc.)?',
      description: 'TypeScript strict mode catches many bugs early. Confirm the baseline config with the team.',
    },
    {
      question: 'What state management approach is preferred? (Redux Toolkit, Zustand, Context API, Jotai, TanStack Query for server state)',
      description: 'Misaligned state management choices cause rework. Agree before building the first component.',
    },
    {
      question: 'Are there preferred UI component libraries? (shadcn/ui, MUI, Ant Design, Radix, or fully custom)',
      description: 'Influences design system, bundle size, and theming strategy.',
    },
    {
      question: 'What bundler/build tool is expected? (Webpack, Vite, Turbopack, Parcel)',
      description: 'Affects dev server speed, config compatibility, and CI build times.',
    },
    {
      question: 'Is there a monorepo setup? (Turborepo, Nx, plain npm/yarn workspaces)',
      description: 'Monorepo structure affects how shared packages and apps are developed and deployed.',
    },
    {
      question: 'Are there environment variables that must be exposed to the browser (NEXT_PUBLIC_*)? Who owns and manages .env files?',
      description: 'Leaked secrets and missing vars are common deployment blockers.',
    },
    {
      question: 'What minimum code/test coverage percentage is expected? Which testing frameworks? (Jest, Vitest, Cypress, Playwright)',
      description: 'Setting coverage expectations early avoids last-minute scrambles before release.',
    },
    {
      question: 'Is there a design token / style dictionary pipeline already in place? Should tokens be auto-synced from Figma?',
      description: 'Determines whether CSS variables should come from a generated token file or be written manually.',
    },
  ],
}

// ── Excel parsing (same logic as lib/parseExcel.ts) ─────────────────────────

function sheetToCategories(ws: XLSX.WorkSheet, sheetName: string): Category[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, {
    header: ['category', 'question', 'answer', 'description'],
    defval: '',
  })

  const categories: Category[] = []
  let currentCategory: Category | null = null
  let categoryIdx = 0
  let questionIdx = 0

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const cat = (row.category || '').trim().replace(/\n+/g, '')
    const q = (row.question || '').trim()
    const excelDesc = (row.description || '').trim()

    if (!q) continue

    if (cat) {
      currentCategory = { name: cat, questions: [] }
      categories.push(currentCategory)
      categoryIdx = categories.length - 1
      questionIdx = 0
    }

    if (!currentCategory) continue

    const id = `${sheetName.toLowerCase()}-${categoryIdx}-${questionIdx}`
    // Excel description wins if non-empty; otherwise fall back to our hardcoded descriptions
    const description = excelDesc || DESCRIPTIONS[id] || undefined

    currentCategory.questions.push({ id, question: q, description })
    questionIdx++
  }

  return categories
}

async function main() {
  const filePath = join(process.cwd(), '..', 'Frontend_Developer_Questions.xlsx')

  // If no Excel file is present, leave the committed public/questions.json untouched.
  if (!require('fs').existsSync(filePath)) {
    console.log('ℹ  No Excel file found — using existing public/questions.json')
    return
  }

  const fileBuffer = require('fs').readFileSync(filePath)
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' })

  const sheetOrder = ['Project', 'Design', 'Backend', 'Other']
  const sheets: Sheet[] = []

  for (const name of sheetOrder) {
    const wsName = workbook.SheetNames.find((n: string) => n === name)
    if (!wsName) continue
    const ws = workbook.Sheets[wsName]
    const categories = sheetToCategories(ws, name)

    if (name === 'Project') {
      categories.push({
        name: EXTRA_QUESTIONS.category,
        questions: EXTRA_QUESTIONS.questions.map((q, qi) => ({
          id: `project-extra-${qi}`,
          question: q.question,
          description: q.description,
        })),
      })
    }

    sheets.push({ name, categories })
  }

  const outDir = join(process.cwd(), 'public')
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'questions.json'), JSON.stringify(sheets))
  console.log(`✓ Generated public/questions.json (${sheets.length} sheets, ${sheets.reduce((s, sh) => s + sh.categories.reduce((c, cat) => c + cat.questions.length, 0), 0)} questions)`)
}

main().catch((err) => { console.error(err); process.exit(1) })
