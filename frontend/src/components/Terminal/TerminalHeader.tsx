import { VscChromeClose, VscClearAll } from 'react-icons/vsc'
import { FaStop } from 'react-icons/fa'

import GhostButton from '@/components/GhostButton/GhostButton'

type Props = {
    isActive: boolean
    onClear: () => void
    onStop: () => void
    onClose: () => void
}

function TerminalHeader({ isActive, onClear, onStop, onClose }: Props) {
    return (
        <div className='ide-terminal-header'>
            <div className='ide-terminal-title'>Terminal</div>
            <div className='ide-terminal-actions'>
                <GhostButton className='danger' onClick={onStop} title='Stop program' disabled={!isActive}>
                    <FaStop />
                </GhostButton>
                <GhostButton onClick={onClear} title='Clear terminal'>
                    <VscClearAll />
                </GhostButton>
                <GhostButton onClick={onClose}>
                    <VscChromeClose />
                </GhostButton>
            </div>
        </div>
    )
}

export default TerminalHeader
