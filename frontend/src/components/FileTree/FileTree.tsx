// import { useFileTreeState } from '@/hooks/useFileTreeState'
// import FileTreeNode from '@/components/FileTree/FileTreeNode'
// import useFileTree from '@/hooks/useFileTree'
// import '@/components/FileTree/FileTree.css'

// type FileTreeProps = {
//     tree: ReturnType<typeof useFileTree>
//     state: ReturnType<typeof useFileTreeState>
// }

// function FileTree({ tree, state }: FileTreeProps) {
//     return (
//         <div className='filetree'>
//             <FileTreeNode node={tree} depth={-1} />

//             {tree.children.length === 0 && !state.creating && <div className='filetree-empty'>No files yet</div>}
//         </div>
//     )
// }

// export default FileTree

import { useFileTree } from '@/hooks/useFileTree'
import FileTreeNode from '@/components/FileTree/FileTreeNode'
import '@/components/FileTree/FileTree.css'

function FileTree() {
    const state = useFileTree()

    if (!state) return null

    const { tree, creating } = state

    return (
        <div className='filetree'>
            <FileTreeNode node={tree} depth={-1} />
            {tree.children.length === 0 && !creating && <div className='filetree-empty'>No files yet</div>}
        </div>
    )
}

export default FileTree
