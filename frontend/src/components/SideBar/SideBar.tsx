// import '@/components/SideBar/SideBar.css'
// import FileTree from '@/components/FileTree/FileTree'
// import { FileTreeContext, useFileTreeState } from '@/hooks/useFileTreeState'
// import SideBarHeader from '@/components/SideBar/SideBarHeader'
// import useFileTree from '@/hooks/useFileTree'

// function SideBar() {
//     const state = useFileTreeState()
//     const tree = useFileTree()

//     return (
//         <div className='ide-sidebar'>
//             <SideBarHeader
//                 onNewFile={() => state.startCreating(null, 'file')}
//                 onNewDirectory={() => state.startCreating(null, 'dir')}
//             />
//             <FileTreeContext value={state}>
//                 <FileTree tree={tree} state={state} />
//             </FileTreeContext>
//         </div>
//     )
// }

// export default SideBar

import '@/components/SideBar/SideBar.css'
import { FileTreeContext, useFileTreeState } from '@/hooks/useFileTree'
import SideBarHeader from '@/components/SideBar/SideBarHeader'
import FileTree from '@/components/FileTree/FileTree'

function SideBar() {
    const state = useFileTreeState()

    return (
        <div className='ide-sidebar'>
            <SideBarHeader
                onNewFile={() => state.startCreating(null, 'file')}
                onNewDirectory={() => state.startCreating(null, 'dir')}
            />
            <FileTreeContext value={state}>
                <FileTree />
            </FileTreeContext>
        </div>
    )
}

export default SideBar
