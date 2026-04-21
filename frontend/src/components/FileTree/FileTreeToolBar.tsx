import { VscNewFile, VscNewFolder, VscEdit, VscTrash } from 'react-icons/vsc'

import GhostButton from '@/components/GhostButton/GhostButton'
import { MAX_PROJECT_FILES } from '@/config'

interface Props {
    onCreateFile: () => void
    onCreateDir: () => void
    onRename: () => void
    onDelete: () => void
    canWrite: boolean
    canRenameOrDelete: boolean
    fileLimitReached: boolean
}

function FileTreeToolBar({
    onCreateFile,
    onCreateDir,
    onRename,
    onDelete,
    canWrite,
    canRenameOrDelete,
    fileLimitReached,
}: Props) {
    return (
        <div className='file-tree-toolbar'>
            <span className='toolbar-project'>Project</span>
            <div className='toolbar-buttons'>
                <GhostButton
                    onClick={onCreateFile}
                    disabled={!canWrite || fileLimitReached}
                    title={fileLimitReached ? `File limit reached (${MAX_PROJECT_FILES} files max)` : 'New File'}
                >
                    <VscNewFile />
                </GhostButton>
                <GhostButton onClick={onCreateDir} disabled={!canWrite} title='New Directory'>
                    <VscNewFolder />
                </GhostButton>
                <GhostButton onClick={onRename} disabled={!canRenameOrDelete} title='Rename'>
                    <VscEdit />
                </GhostButton>
                <GhostButton onClick={onDelete} disabled={!canRenameOrDelete} title='Delete' className='danger'>
                    <VscTrash />
                </GhostButton>
            </div>
        </div>
    )
}

export default FileTreeToolBar
