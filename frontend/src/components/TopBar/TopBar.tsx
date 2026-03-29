import GhostButton from '@/components/GhostButton/GhostButton'
import '@/components/TopBar/TopBar.css'

function TopBar() {
    return (
        <div className='ide-topbar'>
            <GhostButton>File</GhostButton>
            <GhostButton>Edit</GhostButton>
            <GhostButton>View</GhostButton>
        </div>
    )
}

export default TopBar
