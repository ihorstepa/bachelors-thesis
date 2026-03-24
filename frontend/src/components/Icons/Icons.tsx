import {
    DocumentIcon,
    ChevronRightIcon,
    ChevronDownIcon,
    DocumentPlusIcon,
    FolderPlusIcon,
    TrashIcon,
} from '@heroicons/react/24/outline'

import '@/components/Icons/Icons.css'

interface IconProps {
    size?: number | string
    className?: string
}

function renderIcon(
    IconComponent: any,
    size: number | string = 14,
    className: string = '',
    extraClassName: string = '',
) {
    return (
        <IconComponent
            width={size}
            height={size}
            className={`${extraClassName} ${className}`.trim()}
            aria-hidden='true'
        />
    )
}

export function IconFile({ size = 14, className = '' }: IconProps) {
    return renderIcon(DocumentIcon, size, className)
}

export function IconNewFile({ size = 14, className = '' }: IconProps) {
    return renderIcon(DocumentPlusIcon, size, className)
}

export function IconNewDirectory({ size = 14, className = '' }: IconProps) {
    return renderIcon(FolderPlusIcon, size, className)
}

export function IconTrash({ size = 13, className = '' }: IconProps) {
    return renderIcon(TrashIcon, size, className)
}

export function IconChevron({ open, size = 13, className = '' }: IconProps & { open: boolean }) {
    const IconComponent = open ? ChevronDownIcon : ChevronRightIcon
    return renderIcon(IconComponent, size, className)
}
