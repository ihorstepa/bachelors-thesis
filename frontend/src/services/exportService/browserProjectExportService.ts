import JSZip from 'jszip'

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
            const zip = new JSZip()
            const resolvedFiles = await Promise.all(files)
            for (const file of resolvedFiles) {
                zip.file(file.name, file.data)
            }
            const zipBlob = await zip.generateAsync({ type: 'blob' })
            this.downloadZipBlob(name, zipBlob)
        } finally {
            for (const fileId of openFileIds) {
                this.fileSyncManager.closeFile(fileId)
            }
        }
    }

    private downloadZipBlob(name: string, zipBlob: Blob): void {
        const safeName = this.sanitizeName(name)
        const url = URL.createObjectURL(zipBlob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `${safeName}.zip`
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
