import type { JSX } from 'react'
import { VscFolder } from 'react-icons/vsc'

import FileIcon from '@/components/Icons/FileIcon'
import type { NodeType } from '@/core/fileSystemManager'

type Props = {
    type: NodeType
    name: string
}

function FileTreeDragPreview({ type, name }: Props): JSX.Element {
    return (
        <div className='tree-drag-preview'>
            <div className='tree-drag-preview-main'>
                <span className='tree-drag-preview-icon'>
                    {type === 'file' ? <FileIcon filename={name} /> : <VscFolder />}
                </span>
                <span className='tree-drag-preview-name'>{name}</span>
            </div>
        </div>
    )
}

export default FileTreeDragPreview
