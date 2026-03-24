import GhostButton from '@/components/GhostButton/GhostButton'
import { IconNewFile, IconNewDirectory } from '@/components/Icons/Icons'

type SideBarHeaderProps = {
    onNewFile: () => void
    onNewDirectory: () => void
}

function SideBarHeader({ onNewFile, onNewDirectory }: SideBarHeaderProps) {
    return (
        <div className='sidebar-header'>
            <span className='sidebar-title'>Explorer</span>
            <div className='sidebar-header-actions'>
                <GhostButton title='New File' onClick={onNewFile}>
                    <IconNewFile />
                </GhostButton>
                <GhostButton title='New Directory' onClick={onNewDirectory}>
                    <IconNewDirectory />
                </GhostButton>
            </div>
        </div>
    )
}

export default SideBarHeader
