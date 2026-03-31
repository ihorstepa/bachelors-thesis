import { useDroppable } from '@dnd-kit/react'
import type { JSX } from 'react'

type Props = {
    children: React.ReactNode
}

function FileTreeRoot({ children }: Props): JSX.Element {
    const { ref } = useDroppable({
        id: 'root',
    })

    return (
        <div ref={ref} className={`tree-view`}>
            {children}
        </div>
    )
}

export default FileTreeRoot
