import { useNavigate, useParams } from 'react-router'
import { VscClose } from 'react-icons/vsc'

import GhostButton from '@/components/GhostButton/GhostButton'
import '@/components/IdeTopBar/IdeTopBar.css'

type IdeTopBarProps = {
    projectName?: string
}

function IdeTopBar({ projectName }: IdeTopBarProps) {
    const navigate = useNavigate()
    const { projectId } = useParams()

    return (
        <div className='ide-topbar'>
            <div className='ide-topbar-left'>
                <GhostButton>File</GhostButton>
                <GhostButton>Edit</GhostButton>
                <GhostButton>View</GhostButton>
            </div>
            <span className='ide-topbar-title'>{projectId ? (projectName ?? 'project') : 'playground'}</span>
            <div className='ide-topbar-right'>
                <GhostButton className='ide-topbar-close' onClick={() => navigate('/')} title='Close project'>
                    <VscClose />
                </GhostButton>
            </div>
        </div>
    )
}

export default IdeTopBar
