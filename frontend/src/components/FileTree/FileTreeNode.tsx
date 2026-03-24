// import { useFileTreeContext } from '@/hooks/useFileTreeState'
// import FileTreeRow from '@/components/FileTree/FileTreeRow'
// import FileTreeTextInput from '@/components/FileTree/FileTreeTextInput'
// import type { FileTreeNode as FileTreeNodeType } from '@/hooks/useFileTree'

// type FileTreeNodeProps = {
//     node: FileTreeNodeType
//     depth: number
// }

// function FileTreeNode({ node, depth }: FileTreeNodeProps) {
//     const { creating, confirmCreate, cancelCreating, openDirs } = useFileTreeContext()

//     const isDir = node.type === 'dir'
//     const isOpen = node.id !== null && openDirs.has(node.id)
//     const isCreatingHere = creating?.parentId === node.id
//     const indent = depth * 12 + 8

//     return (
//         <div>
//             {node.id !== null && <FileTreeRow node={node} indent={indent} />}

//             {isCreatingHere && (
//                 <FileTreeTextInput
//                     type={creating!.type}
//                     onConfirm={confirmCreate}
//                     onCancel={cancelCreating}
//                     indent={indent}
//                 />
//             )}

//             {isDir &&
//                 (isOpen || node.id === null) &&
//                 node.children.map((child) => <FileTreeNode key={child.id} node={child} depth={depth + 1} />)}
//         </div>
//     )
// }

// export default FileTreeNode

import { useFileTree } from '@/hooks/useFileTree'
import FileTreeRow from '@/components/FileTree/FileTreeRow'
import FileTreeTextInput from '@/components/FileTree/FileTreeTextInput'
import type { FileTreeNode as FileTreeNodeType } from '@/hooks/useFileTree'

type Props = {
    node: FileTreeNodeType
    depth: number
}

function FileTreeNode({ node, depth }: Props) {
    const state = useFileTree()
    if (!state) return null

    const { creating, confirmCreate, cancelCreating, openDirs } = state

    const isDir = node.type === 'dir'
    const isOpen = node.id !== null && openDirs.has(node.id)
    const isCreatingHere = creating?.parentId === node.id

    return (
        <div>
            {node.id !== null && <FileTreeRow node={node} indent={depth * 12 + 8} />}

            {isCreatingHere && (
                <FileTreeTextInput
                    type={creating.type}
                    onConfirm={confirmCreate}
                    onCancel={cancelCreating}
                    indent={(depth + 1) * 12 + 8}
                />
            )}

            {isDir &&
                (isOpen || node.id === null) &&
                node.children.map((child) => <FileTreeNode key={child.id} node={child} depth={depth + 1} />)}
        </div>
    )
}

export default FileTreeNode
