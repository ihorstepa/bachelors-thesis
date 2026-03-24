import { useTabs } from '@/hooks/useTabs'
import CodeMirror from '@/components/Editor/CodeMirror'
import '@/components/Editor/Editor.css'

function Editor() {
    const { tabs, activeId } = useTabs()

    if (tabs.length === 0) {
        return <div className='ide-editor-empty'>Open a file to start editing</div>
    }

    return (
        <>
            {tabs.map((fileId) => (
                <div
                    key={fileId}
                    className='ide-editor-container'
                    style={{ display: fileId === activeId ? 'block' : 'none' }}
                >
                    <CodeMirror fileId={fileId} isActive={fileId === activeId} />
                </div>
            ))}
        </>
    )
}

export default Editor
