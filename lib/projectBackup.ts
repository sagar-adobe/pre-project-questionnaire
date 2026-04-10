import { saveImage, loadAllImages } from './attachmentStorage'
import { saveProject, generateId, type ProjectData } from './projectStorage'

const BACKUP_FORMAT = 'dq_project_backup_v1'

export type ProjectBackup = {
  _format: typeof BACKUP_FORMAT
  exportedAt: string
  data: ProjectData
  images: Record<string, string>  // imageKey → base64 dataUrl
}

export async function exportProjectBackup(project: ProjectData): Promise<void> {
  const images = await loadAllImages(project.answers)

  const backup: ProjectBackup = {
    _format: BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    data: project,
    images,
  }

  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(project.meta.projectName || 'project').replace(/\s+/g, '_')}_backup_${
    new Date().toISOString().split('T')[0]
  }.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importProjectBackup(file: File): Promise<ProjectData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string
        const backup = JSON.parse(text) as Partial<ProjectBackup>

        if (backup._format !== BACKUP_FORMAT) {
          reject(new Error(
            `Unrecognised file format. Expected "${BACKUP_FORMAT}", got "${backup._format}".`
          ))
          return
        }

        if (!backup.data) {
          reject(new Error('Backup file is missing project data.'))
          return
        }

        const originalData = backup.data
        const images = backup.images ?? {}

        // Give the imported project a fresh ID so it never conflicts with an existing one
        const newId = generateId()
        const now = new Date().toISOString()
        const newData: ProjectData = {
          ...originalData,
          meta: {
            ...originalData.meta,
            id: newId,
            projectName: originalData.meta.projectName
              ? `${originalData.meta.projectName} (imported)`
              : 'Imported Project',
            updatedAt: now,
          },
          // Ensure all newer fields exist (forward-migration)
          mandatoryQuestions: originalData.mandatoryQuestions ?? [],
          hiddenCategories: originalData.hiddenCategories ?? [],
          customCategories: originalData.customCategories ?? [],
          customSheets: originalData.customSheets ?? [],
          hiddenSheets: originalData.hiddenSheets ?? [],
        }

        // Restore images to IndexedDB (keys are preserved, so links in answers still work)
        for (const [key, dataUrl] of Object.entries(images)) {
          await saveImage(key, dataUrl as string)
        }

        saveProject(newData)
        resolve(newData)
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to parse backup file.'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file.'))
    reader.readAsText(file)
  })
}
