import fileManagementService from '@/services/fileManagementService'
import syncManagementService from '@/services/syncManagementService'

class ProjectSession {
    constructor(projectId: string) {
        syncManagementService.init(projectId)
        fileManagementService.init()
    }

    public destroy() {
        syncManagementService.disconnectAll()
    }
}
