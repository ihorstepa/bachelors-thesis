import { useState, useRef, useLayoutEffect } from 'react'
import ReactCodeMirror from '@uiw/react-codemirror'
import type { EditorView } from '@codemirror/view'

import { useService } from '@/core/ServiceContainer'
import { IFileSyncManager } from '@/core/interfaces/fileSyncManager'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import getExtensions from '@/components/Editor/extensions'
import Spinner from '@/components/Spinner/Spinner'
import type { SharedFile } from '@/core/interfaces/fileSyncManager'

type Props = {
    fileId: string
    isActive: boolean
}

function CodeMirror({ fileId, isActive }: Props) {
    const fileSyncManager = useService(IFileSyncManager)
    const [file, setFile] = useState<SharedFile | null>(null)
    const [isSynced, setIsSynced] = useState(false)
    const editorViewRef = useRef<EditorView | null>(null)

    useAsyncEffect(
        async (isAborted) => {
            setIsSynced(false)
            const sharedFile = await fileSyncManager.openFile(fileId)

            if (isAborted()) return
            setFile(sharedFile)
            await sharedFile.synced

            if (isAborted()) return
            setIsSynced(true)
        },
        () => {
            fileSyncManager.closeFile(fileId)
            setFile(null)
            setIsSynced(false)
        },
        [fileId],
    )

    useLayoutEffect(() => {
        if (!file) return

        if (!isActive) {
            file.awareness.setLocalState(null)
        } else {
            editorViewRef.current?.focus()
            if (!file.awareness.getLocalState()) {
                file.awareness.setLocalState({})
            }
        }
    }, [isActive, file])

    if (!file || !isSynced) {
        return (
            <div className='ide-editor-empty'>
                <Spinner />
            </div>
        )
    }

    return (
        <ReactCodeMirror
            value={file.doc.getText().toString()}
            className='ide-editor'
            height='100%'
            // minHeight={}
            // maxHeight={}
            width='100%'
            // minWidth={}
            // maxWidth={}
            autoFocus={true}
            // placeholder={}
            theme='none'
            basicSetup={false}
            editable={true}
            readOnly={false}
            // indentWithTab={}
            // onChange={}
            // onStatistics={}
            // onUpdate={}
            onCreateEditor={(view) => {
                editorViewRef.current = view
            }}
            extensions={getExtensions(file)}
            // root={}
            // initialState={}
        />
    )
}

export default CodeMirror
