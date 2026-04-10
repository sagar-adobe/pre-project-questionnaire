export type FieldType = 'textarea' | 'radio' | 'checkbox'

export type QuestionTypeConfig =
  | { type: 'textarea' }
  | { type: 'radio'; options: string[] }
  | { type: 'checkbox'; options: string[] }

export const NA_VALUE = '__NA__'

// Returns true if a question has been meaningfully answered
export function isAnswered(answer: string | undefined): boolean {
  if (!answer) return false
  if (answer === NA_VALUE) return true
  if (answer.trim() === '' || answer === '[]') return false
  return true
}

// Parse a checkbox answer (stored as JSON array) into string array
export function parseCheckboxAnswer(answer: string): string[] {
  if (!answer) return []
  try {
    const parsed = JSON.parse(answer)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// Toggle a single option in a checkbox answer
export function toggleCheckboxOption(currentAnswer: string, option: string): string {
  const selected = parseCheckboxAnswer(currentAnswer)
  if (selected.includes(option)) {
    return JSON.stringify(selected.filter((s) => s !== option))
  }
  return JSON.stringify([...selected, option])
}

// Format an answer for display in exports
export function formatAnswerForExport(answer: string, typeConfig: QuestionTypeConfig): string {
  if (!answer) return '—'
  if (answer === NA_VALUE) return 'N/A'
  if (typeConfig.type === 'checkbox') {
    const items = parseCheckboxAnswer(answer)
    return items.length === 0 ? '—' : items.join(', ')
  }
  return answer.trim() || '—'
}

// ─── Question type overrides ───────────────────────────────────────────────

type Override = {
  match: string
  type: 'radio' | 'checkbox'
  options: string[]
}

const OVERRIDES: Override[] = [
  // ── Checkbox: browsers
  {
    match: 'browsers must be supported',
    type: 'checkbox',
    options: ['Chrome', 'Firefox', 'Safari', 'Edge', 'IE11 (Legacy)', 'Opera', 'Samsung Internet'],
  },
  // ── Checkbox: devices & screen sizes
  {
    match: 'devices and screen sizes must',
    type: 'checkbox',
    options: ['Mobile (< 768px)', 'Tablet (768px – 1024px)', 'Desktop (1024px+)', 'Large Desktop (1440px+)'],
  },
  // ── Checkbox: target platforms
  {
    match: 'platforms is this design targeting',
    type: 'checkbox',
    options: ['Web (Browser)', 'iOS', 'Android', 'Windows Desktop', 'macOS Desktop'],
  },
  // ── Checkbox: auth mechanisms
  {
    match: 'authentication mechanism is used',
    type: 'checkbox',
    options: ['Session Cookies', 'JWT (JSON Web Token)', 'OAuth2', 'SAML', 'SSO', 'API Key', 'Basic Auth'],
  },
  // ── Checkbox: social logins
  {
    match: 'social logins or external authentication',
    type: 'checkbox',
    options: ['Google', 'Facebook', 'Apple', 'Microsoft', 'GitHub', 'LinkedIn', 'Twitter/X'],
  },
  // ── Checkbox: compliance
  {
    match: 'compliance requirements (gdpr',
    type: 'checkbox',
    options: ['GDPR', 'CCPA', 'HIPAA', 'PCI-DSS', 'SOC 2', 'ISO 27001', 'None / Not applicable'],
  },
  // ── Checkbox: environments
  {
    match: 'environments exist',
    type: 'checkbox',
    options: ['Local Development', 'Development', 'Staging', 'QA / UAT', 'Pre-production', 'Production'],
  },
  // ── Checkbox: analytics tools
  {
    match: 'analytics or user-tracking tools',
    type: 'checkbox',
    options: ['Google Analytics 4 (GA4)', 'Google Analytics (UA)', 'Adobe Analytics', 'Hotjar', 'Mixpanel', 'Heap', 'Segment', 'None'],
  },
  // ── Checkbox: testing strategy
  {
    match: 'testing strategy is expected',
    type: 'checkbox',
    options: ['Unit Tests', 'Integration Tests', 'End-to-End (E2E)', 'Visual Regression', 'Performance Tests', 'Accessibility Tests', 'Manual QA'],
  },
  // ── Checkbox: testing frameworks
  {
    match: 'which frameworks (jest',
    type: 'checkbox',
    options: ['Jest', 'Vitest', 'Cypress', 'Playwright', 'Testing Library', 'Storybook', 'None'],
  },
  // ── Checkbox: languages & locales
  {
    match: 'languages and locales must',
    type: 'checkbox',
    options: ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Japanese', 'Chinese (Simplified)', 'Chinese (Traditional)', 'Arabic', 'Hebrew', 'Other'],
  },
  // ── Checkbox: state management
  {
    match: 'state management approach is preferred',
    type: 'checkbox',
    options: ['Redux Toolkit', 'Zustand', 'React Context API', 'Jotai', 'Recoil', 'TanStack Query (server state)', 'SWR', 'No library needed', 'TBD'],
  },
  // ── Checkbox: UI component libraries
  {
    match: 'preferred ui component libraries',
    type: 'checkbox',
    options: ['shadcn/ui', 'Material UI (MUI)', 'Ant Design', 'Radix UI', 'Chakra UI', 'Tailwind CSS (custom)', 'Fully custom', 'TBD'],
  },
  // ── Checkbox: specific compliance in backend
  {
    match: 'specific compliance requirements (gdpr',
    type: 'checkbox',
    options: ['GDPR', 'CCPA', 'HIPAA', 'PCI-DSS', 'SOC 2', 'ISO 27001', 'None'],
  },

  // ── Radio: new vs migration
  {
    match: 'new (greenfield) project or an update',
    type: 'radio',
    options: ['New (Greenfield)', 'Migration from existing', 'Enhancement / Feature addition', 'Full Rewrite', 'TBD'],
  },
  // ── Radio: SSR / SSG
  {
    match: 'server-side rendering (ssr) or static generation',
    type: 'radio',
    options: ['SSR (Server-Side Rendering)', 'SSG (Static Site Generation)', 'CSR (Single-Page App)', 'ISR (Incremental Static Regen)', 'Hybrid', 'TBD'],
  },
  // ── Radio: RTL
  {
    match: 'rtl (right-to-left)',
    type: 'radio',
    options: ['Yes – required now', 'No', 'Planned for future', 'TBD'],
  },
  // ── Radio: CMS
  {
    match: 'site use a cms',
    type: 'radio',
    options: ['AEM (Adobe Experience Manager)', 'Contentful', 'Sanity', 'Strapi', 'WordPress', 'Magento', 'Other CMS', 'No CMS', 'TBD'],
  },
  // ── Radio: TypeScript
  {
    match: 'typescript required',
    type: 'radio',
    options: ['Yes – strict mode', 'Yes – standard', 'No – JavaScript only', 'TBD'],
  },
  // ── Radio: bundler
  {
    match: 'bundler/build tool is expected',
    type: 'radio',
    options: ['Webpack', 'Vite', 'Turbopack', 'Parcel', 'esbuild', 'TBD'],
  },
  // ── Radio: API style
  {
    match: 'apis restful or graphql',
    type: 'radio',
    options: ['REST', 'GraphQL', 'gRPC', 'REST + GraphQL', 'tRPC', 'TBD'],
  },
  // ── Radio: hosting
  {
    match: 'where will the app be hosted',
    type: 'radio',
    options: ['AWS', 'Google Cloud (GCP)', 'Microsoft Azure', 'Vercel', 'Netlify', 'Cloudflare Pages', 'Self-hosted / On-prem', 'TBD'],
  },
  // ── Radio: dark mode
  {
    match: 'light/dark mode (or high-contrast) variants defined',
    type: 'radio',
    options: ['Yes – both modes defined', 'Light mode only', 'Dark mode only', 'High-contrast only', 'Not required', 'TBD'],
  },
  // ── Radio: design mockups
  {
    match: 'completed design mockups',
    type: 'radio',
    options: ['Figma mockups provided', 'Partial mockups', 'Wireframes only', 'Developer interprets spec', 'TBD'],
  },
  // ── Radio: grid system
  {
    match: 'grid or column system is intended',
    type: 'radio',
    options: ['12-column grid', '16-column grid', 'Custom CSS grid', 'Flexbox only', 'No specific grid', 'TBD'],
  },
]

export function getQuestionType(question: string): QuestionTypeConfig {
  const q = question.toLowerCase()
  for (const override of OVERRIDES) {
    if (q.includes(override.match.toLowerCase())) {
      return { type: override.type, options: override.options }
    }
  }
  return { type: 'textarea' }
}
