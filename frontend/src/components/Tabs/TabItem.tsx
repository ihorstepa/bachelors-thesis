import { useSortable } from '@dnd-kit/react/sortable'
import { XMarkIcon } from '@heroicons/react/24/outline'

type Props = {
    id: string
    index: number
    name: string
    isActive: boolean
    onActivate: () => void
    onClose: (e: React.MouseEvent) => void
}

function TabItem({ id, index, name, isActive, onActivate, onClose }: Props) {
    const { ref, isDragging } = useSortable({ id, index })

    return (
        <div
            ref={ref}
            className={`tab ${isActive ? 'active' : ''} ${isDragging ? 'dragging' : ''}`}
            onClick={onActivate}
        >
            <span className='tab-name'>{name}</span>
            <button className='tab-close' onClick={onClose} onPointerDown={(e) => e.stopPropagation()}>
                <XMarkIcon width={12} height={12} />
            </button>
        </div>
    )
}

export default TabItem
