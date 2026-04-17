import { useSortable } from '@dnd-kit/react/sortable'
import { HiXMark } from 'react-icons/hi2'
import FileIcon from '@/components/Icons/FileIcon'

type Props = {
    id: string
    index: number
    name: string
    isActive: boolean
    onClick: () => void
    onClose: (e: React.MouseEvent) => void
}

function TabItem({ id, index, name, isActive, onClick, onClose }: Props) {
    const { ref, isDragging } = useSortable({ id, index })

    return (
        <div ref={ref} className={`tab ${isActive ? 'active' : ''} ${isDragging ? 'dragging' : ''}`} onClick={onClick}>
            <FileIcon filename={name} />
            <span className='tab-name'>{name}</span>
            <button className='tab-close' onClick={onClose} onPointerDown={(e) => e.stopPropagation()}>
                <HiXMark />
            </button>
        </div>
    )
}

export default TabItem
