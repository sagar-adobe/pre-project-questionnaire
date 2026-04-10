import type { FieldType } from './questionTypes'

export type ProjectMeta = {
  id: string
  projectName: string
  clientName: string
  date: string
  createdAt: string
  updatedAt: string
}

export type CustomQuestion = {
  id: string
  sheet: string      // built-in sheet name OR custom sheet id
  category: string   // regular category name OR custom category id
  question: string
  description?: string
  type: FieldType
  options?: string[]
  required?: boolean
}

export type CustomCategory = {
  id: string
  sheet: string  // built-in sheet name OR custom sheet id
  name: string
}

export type CustomSheet = {
  id: string
  name: string
}

export type ProjectData = {
  meta: ProjectMeta
  answers: Record<string, string>    // questionId → answer value (also _notes, _attachments)
  hiddenQuestions: string[]
  customQuestions: CustomQuestion[]
  mandatoryQuestions: string[]
  hiddenCategories: string[]
  customCategories: CustomCategory[]
  customSheets: CustomSheet[]        // user-added sheet tabs
  hiddenSheets: string[]             // built-in sheet names hidden from tab bar
}

const LIST_KEY = 'dq_project_list'

function projectKey(id: string): string {
  return `dq_project_${id}`
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export function getProjectIds(): string[] {
  try {
    const raw = localStorage.getItem(LIST_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getProject(id: string): ProjectData | null {
  try {
    const raw = localStorage.getItem(projectKey(id))
    if (!raw) return null
    const data = JSON.parse(raw) as ProjectData
    // Migrate older data that may be missing newer fields
    if (!data.mandatoryQuestions) data.mandatoryQuestions = []
    if (!data.hiddenCategories) data.hiddenCategories = []
    if (!data.customCategories) data.customCategories = []
    if (!data.customSheets) data.customSheets = []
    if (!data.hiddenSheets) data.hiddenSheets = []
    return data
  } catch {
    return null
  }
}

export function saveProject(data: ProjectData): void {
  localStorage.setItem(projectKey(data.meta.id), JSON.stringify(data))
  const ids = getProjectIds()
  if (!ids.includes(data.meta.id)) {
    localStorage.setItem(LIST_KEY, JSON.stringify([...ids, data.meta.id]))
  }
}

export function createProject(): ProjectData {
  const id = generateId()
  const now = new Date().toISOString()
  const data: ProjectData = {
    meta: {
      id,
      projectName: 'New Project',
      clientName: '',
      date: new Date().toISOString().split('T')[0],
      createdAt: now,
      updatedAt: now,
    },
    answers: {},
    hiddenQuestions: [],
    customQuestions: [],
    mandatoryQuestions: [],
    hiddenCategories: [],
    customCategories: [],
    customSheets: [],
    hiddenSheets: [],
  }
  saveProject(data)
  return data
}

export function deleteProject(id: string): void {
  localStorage.removeItem(projectKey(id))
  const ids = getProjectIds().filter((i) => i !== id)
  localStorage.setItem(LIST_KEY, JSON.stringify(ids))
}

export function getAllProjects(): ProjectData[] {
  return getProjectIds()
    .map((id) => getProject(id))
    .filter((p): p is ProjectData => p !== null)
}
