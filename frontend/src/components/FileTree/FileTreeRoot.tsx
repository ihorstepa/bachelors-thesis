import { useDroppable } from '@dnd-kit/react'
import type { JSX } from 'react'

import OverlayScrollbar from '@/components/OverlayScrollbar/OverlayScrollbar'

type Props = {
    children: React.ReactNode
    onContextMenu?: (event: React.MouseEvent) => void
}

function FileTreeRoot({ children, onContextMenu }: Props): JSX.Element {
    const { ref } = useDroppable({
        id: 'root',
    })

    return (
        <OverlayScrollbar variant='tree' theme='os-theme-ide' x='hidden' y='scroll'>
            <div ref={ref} className='tree-view-content'>
                {children}
                <div className='tree-view-background' onContextMenu={onContextMenu} />
            </div>
        </OverlayScrollbar>
    )
}

export default FileTreeRoot
