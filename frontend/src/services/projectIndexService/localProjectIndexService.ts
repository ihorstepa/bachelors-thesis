import type { FileSystemManager } from '@/core/fileSystemManager'
import type { FileLocation } from '@/core/projectIndexService'
import { ProjectIndexService } from '@/core/projectIndexService'

class LocalProjectIndexService extends ProjectIndexService {
    private fileSystemManager: FileSystemManager
    private fileRefsAll: FileLocation[] = []
    private readonly handleFsChange: () => void

    public constructor(fileSystemManager: FileSystemManager) {
        super()
        this.fileSystemManager = fileSystemManager

        this.recompute = this.recompute.bind(this)
        this.handleFsChange = () => {
            this.recompute()
            this.emit('change')
        }
        this.recompute()

        this.fileSystemManager.on('change', this.handleFsChange)
    }

    public destroy(): void {
        this.fileSystemManager.off('change', this.handleFsChange)
    }

    public getAllFilePaths(): FileLocation[] {
        if (!this.fileRefsAll) this.recompute()
        return this.fileRefsAll
    }

    private recompute(): void {
        const allRefs: FileLocation[] = []

        const traverse = (parentId: string | null, parentPath: string) => {
            for (const child of this.fileSystemManager.getChildrenMeta(parentId)) {
                const fullPath = parentPath ? `${parentPath}/${child.name}` : child.name
                if (child.type === 'dir') {
                    traverse(child.id, fullPath)
                } else {
                    allRefs.push({ id: child.id, path: fullPath })
                }
            }
        }

        traverse(null, '')
        allRefs.sort((a, b) => a.path.localeCompare(b.path))

        this.fileRefsAll = allRefs
    }
}

export default LocalProjectIndexService
