// import { useFileTreeContext } from '@/hooks/useFileTreeState'
// import GhostButton from '@/components/GhostButton/GhostButton'
// import { IconFile, IconNewFile, IconNewDirectory, IconChevron, IconTrash } from '@/components/Icons/Icons'
// import type { FileTreeNode } from '@/hooks/useFileTree'

// type FileTreeRowProps = {
//     node: FileTreeNode
//     indent: number
// }

// function FileTreeRow({ node, indent }: FileTreeRowProps) {
//     const { activeId, selectFile, startCreating, deleteNode, openDirs, toggleDir } = useFileTreeContext()

//     const isDir = node.type === 'dir'
//     const isOpen = node.id !== null && openDirs.has(node.id)
//     const isSelected = activeId === node.id

//     return (
//         <div
//             className={`filetree-row ${isSelected ? 'selected' : ''}`}
//             style={{ paddingLeft: `${indent}px` }}
//             onClick={() => (isDir ? toggleDir(node.id!) : selectFile(node.id!))}
//         >
//             <span className='filetree-row-icon'>{isDir ? <IconChevron open={isOpen} /> : <IconFile />}</span>
//             <span className='filetree-row-name'>{node.name}</span>

//             <span className='filetree-row-actions' onClick={(e) => e.stopPropagation()}>
//                 {isDir && (
//                     <>
//                         <GhostButton title='New File' onClick={() => startCreating(node.id, 'file')}>
//                             <IconNewFile />
//                         </GhostButton>
//                         <GhostButton title='New Directory' onClick={() => startCreating(node.id, 'dir')}>
//                             <IconNewDirectory />
//                         </GhostButton>
//                     </>
//                 )}
//                 <GhostButton title='Delete' onClick={() => deleteNode(node.id!)} className='danger'>
//                     <IconTrash />
//                 </GhostButton>
//             </span>
//         </div>
//     )
// }

// export default FileTreeRow

import { useFileTree } from '@/hooks/useFileTree'
import GhostButton from '@/components/GhostButton/GhostButton'
import { IconFile, IconNewFile, IconNewDirectory, IconChevron, IconTrash } from '@/components/Icons/Icons'
import type { FileTreeNode } from '@/hooks/useFileTree'

type Props = { node: FileTreeNode; indent: number }

function FileTreeRow({ node, indent }: Props) {
    const state = useFileTree()
    if (!state) return null

    const { activeId, selectFile, startCreating, deleteNode, openDirs, toggleDir } = state

    const isDir = node.type === 'dir'
    const isOpen = node.id !== null && openDirs.has(node.id)
    const isSelected = activeId === node.id

    return (
        <div
            className={`filetree-row ${isSelected ? 'selected' : ''}`}
            style={{ paddingLeft: `${indent}px` }}
            onClick={() => (isDir ? toggleDir(node.id!) : selectFile(node.id!))}
        >
            <span className='filetree-row-icon'>{isDir ? <IconChevron open={isOpen} /> : <IconFile />}</span>
            <span className='filetree-row-name'>{node.name}</span>

            <span className='filetree-row-actions' onClick={(e) => e.stopPropagation()}>
                {isDir && (
                    <>
                        <GhostButton title='New File' onClick={() => startCreating(node.id, 'file')}>
                            <IconNewFile />
                        </GhostButton>
                        <GhostButton title='New Directory' onClick={() => startCreating(node.id, 'dir')}>
                            <IconNewDirectory />
                        </GhostButton>
                    </>
                )}
                <GhostButton title='Delete' onClick={() => deleteNode(node.id!)} className='danger'>
                    <IconTrash />
                </GhostButton>
            </span>
        </div>
    )
}

export default FileTreeRow
