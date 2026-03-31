import { useState, useRef, useMemo, useEffect } from 'react'
import ReactCodeMirror from '@uiw/react-codemirror'
import type { EditorView, ViewUpdate } from '@codemirror/view'
import type { JSX } from 'react'

import { useService } from '@/contextProviders/ServiceProvider'
import { FileSyncManager } from '@/core/fileSyncManager'
import { PresenceService } from '@/core/presenceService'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import type { SharedFile } from '@/core/fileSyncManager'
import ExtensionProvider from './extensionProvider'
import { FileSystemManager, type NodeMeta } from '@/core/fileSystemManager'
import { useEditor } from '@/contextProviders/EditorProvider'
import Spinner from '@/components/Spinner/Spinner'
import { getLanguageName } from './extensions/language'

type Props = {
    fileId: string
    isActive: boolean
}

function CodeMirror({ fileId, isActive }: Props): JSX.Element {
    const fileSystemManager = useService(FileSystemManager)
    const fileSyncManager = useService(FileSyncManager)
    const presenceService = useService(PresenceService)

    const [file, setFile] = useState<SharedFile | null>(null)
    const [meta, setMeta] = useState<NodeMeta | null>(null)
    const [isSynced, setIsSynced] = useState(false)
    const editorViewRef = useRef<EditorView | null>(null)
    const { setEditorState } = useEditor()

    const extensionProvider = useMemo(() => new ExtensionProvider(), [fileId])
    const extensions = file && meta ? extensionProvider.getExtensions(file, meta) : []

    useEffect(() => {
        return fileSystemManager.on('rename', (id) => {
            if (id === fileId) {
                setMeta(fileSystemManager.getMeta(id))
            }
        })
    }, [fileId])

    useEffect(() => {
        if (!isActive || !meta) return
        setEditorState((prev) => ({ ...prev, language: getLanguageName(meta.name) }))
    }, [isActive, meta])

    useEffect(() => {
        const view = editorViewRef.current
        if (!view || !meta || !isSynced) return
        view.dispatch({ effects: extensionProvider.reconfigure(meta) })
    }, [meta, isSynced])

    useAsyncEffect(
        async (isAborted) => {
            setIsSynced(false)
            const file = await fileSyncManager.openFile(fileId)

            if (isAborted()) return
            setFile(file)
            setMeta(fileSystemManager.getMeta(fileId))

            await file.synced

            if (isAborted()) return
            setIsSynced(true)
        },
        () => {
            fileSyncManager.closeFile(fileId)
            setFile(null)
            setMeta(null)
            setIsSynced(false)
        },
        [fileId],
    )

    useEffect(() => {
        if (!file) return

        if (!isActive) {
            file.awareness.setLocalState(null)
        } else {
            editorViewRef.current?.focus()
            const user = presenceService.setLocation(fileId)
            file.awareness.setLocalState({
                user: {
                    name: user.name,
                    color: user.color,
                },
            })
        }
    }, [isActive, file])

    if (!file || !isSynced) {
        return (
            <div className='ide-editor-empty'>
                <Spinner />
            </div>
        )
    }

    const onUpdate = (update: ViewUpdate) => {
        if (!isActive) return
        const state = update.state
        const head = state.selection.main.head
        const line = state.doc.lineAt(head)
        const selected = state.selection.ranges.reduce((acc, r) => acc + r.to - r.from, 0)
        setEditorState((prev) => ({
            ...prev,
            line: line.number,
            column: head - line.from + 1,
            selected,
        }))
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
            onUpdate={onUpdate}
            onCreateEditor={(view) => {
                editorViewRef.current = view
            }}
            extensions={extensions}
            // extensions={getExtensions(file)}
            // root={}
            // initialState={}
        />
    )
}

export default CodeMirror
