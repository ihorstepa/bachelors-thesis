import { VscNewFile, VscNewFolder, VscEdit, VscTrash } from 'react-icons/vsc'

import GhostButton from '@/components/GhostButton/GhostButton'

interface Props {
    onCreateFile: () => void
    onCreateDir: () => void
    onRename: () => void
    onDelete: () => void
    canRenameOrDelete: boolean
}

function FileTreeToolBar({ onCreateFile, onCreateDir, onRename, onDelete, canRenameOrDelete }: Props) {
    return (
        <div className='file-tree-toolbar'>
            <span className='toolbar-project'>Project</span>
            <div className='toolbar-buttons'>
                <GhostButton onClick={onCreateFile} title='New File'>
                    <VscNewFile />
                </GhostButton>
                <GhostButton onClick={onCreateDir} title='New Directory'>
                    <VscNewFolder />
                </GhostButton>
                <GhostButton onClick={onRename} disabled={!canRenameOrDelete} title='Rename'>
                    <VscEdit />
                </GhostButton>
                <GhostButton onClick={onDelete} disabled={!canRenameOrDelete} title='Delete' className='delete-button'>
                    <VscTrash />
                </GhostButton>
            </div>
        </div>
    )
}

export default FileTreeToolBar
