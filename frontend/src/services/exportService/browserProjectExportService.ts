import { createTar } from 'nanotar'

import { ExportService } from '@/core/exportService'
import { FileSyncManager } from '@/core/fileSyncManager'
import { ProjectIndexService } from '@/core/projectIndexService'

class BrowserProjectExportService extends ExportService {
    private projectIndexService: ProjectIndexService
    private fileSyncManager: FileSyncManager

    public constructor(projectIndexService: ProjectIndexService, fileSyncManager: FileSyncManager) {
        super()
        this.projectIndexService = projectIndexService
        this.fileSyncManager = fileSyncManager
    }

    public async exportProject(name: string): Promise<void> {
        const openFileIds: string[] = []
        try {
            const files = this.projectIndexService.getAllFilePaths().map(async ({ id, path }) => {
                const file = await this.fileSyncManager.openFile(id)
                openFileIds.push(id)

                return {
                    name: path,
                    data: file.doc.getText().toString(),
                }
            })
            const tarData = createTar(await Promise.all(files))
            this.downloadTarBlob(name, tarData)
        } finally {
            for (const fileId of openFileIds) {
                this.fileSyncManager.closeFile(fileId)
            }
        }
    }

    private downloadTarBlob(name: string, tarData: Uint8Array): void {
        const safeProjectName = this.sanitizeName(name)
        const bytes = new Uint8Array(tarData.byteLength)
        bytes.set(tarData)
        const tarBlob = new Blob([bytes.buffer], { type: 'application/x-tar' })

        const url = URL.createObjectURL(tarBlob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `${safeProjectName}.tar`
        document.body.append(anchor)

        anchor.click()
        anchor.remove()
        URL.revokeObjectURL(url)
    }

    private sanitizeName(name: string): string {
        const normalized = name.trim().replace(/\s+/g, '-')
        const safe = normalized.replace(/[\\/:*?"<>|]/g, '-')
        return safe.length > 0 ? safe : 'project'
    }
}

export default BrowserProjectExportService
