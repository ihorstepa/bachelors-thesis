import { useEffect, useState } from 'react'
import { VscTerminal } from 'react-icons/vsc'
import { FaStop } from 'react-icons/fa'

import { useCodeRunner } from '@/contextProviders/CodeRunnerProvider'
import { useTerminal } from '@/contextProviders/TerminalProvider'
import type { CodeRunnerStatus } from '@/core/codeRunner'
import '@/components/RunPanel/RunPanel.css'

const runButtonLabels: Partial<Record<CodeRunnerStatus, string>> = {
    syncing: 'Syncing...',
    compiling: 'Compiling...',
    linking: 'Linking...',
    running: 'Running...',
}

type Props = {
    canWrite: boolean
}

function RunPanel({ canWrite }: Props) {
    const { status, hasConfig, targets, error, runner } = useCodeRunner()
    const { setTerminalOpen } = useTerminal()
    const isActive = ['syncing', 'compiling', 'linking', 'running'].includes(status)
    const [selectedTarget, setSelectedTarget] = useState<string>('')

    const selectedTargetValue = targets.includes(selectedTarget) ? selectedTarget : ''

    useEffect(() => {
        if (selectedTargetValue) return

        if (targets.length > 0) {
            setSelectedTarget(targets[0])
        } else {
            setSelectedTarget('')
        }
    }, [selectedTargetValue, targets])

    return (
        <div className='run-panel'>
            <div className='run-panel-card'>
                <label className='run-panel-label' htmlFor='run-target'>
                    Target
                </label>
                <select
                    id='run-target'
                    className='run-panel-select'
                    disabled={!hasConfig || isActive || targets.length === 0}
                    value={selectedTargetValue}
                    onChange={(e) => setSelectedTarget(e.target.value)}
                >
                    {targets.length === 0 && (
                        <option value='' disabled>
                            No targets found
                        </option>
                    )}
                    {targets.map((target) => (
                        <option key={target} value={target}>
                            {target}
                        </option>
                    ))}
                </select>
            </div>

            <div className='run-panel-actions'>
                <button
                    className='run-panel-btn run-panel-btn-primary'
                    onClick={() => runner.run(selectedTargetValue)}
                    disabled={!hasConfig || isActive || !selectedTargetValue}
                >
                    {runButtonLabels[status] ?? 'Run'}
                </button>
                <button
                    className={`run-panel-icon-btn ${isActive ? 'danger' : ''}`}
                    onClick={() => runner.stop()}
                    disabled={!isActive}
                    title='Stop'
                >
                    <FaStop />
                </button>
                <button className='run-panel-icon-btn' onClick={() => setTerminalOpen(true)} title='Open terminal'>
                    <VscTerminal />
                </button>
            </div>

            {!hasConfig ? (
                <div className='run-panel-note'>
                    No run config detected -{' '}
                    <button
                        className='run-panel-link'
                        type='button'
                        onClick={() => runner.createConfig()}
                        disabled={isActive || !canWrite}
                    >
                        create
                    </button>
                </div>
            ) : null}
            {error ? <div className='run-panel-note run-panel-error'>{error}</div> : null}
        </div>
    )
}

export default RunPanel
