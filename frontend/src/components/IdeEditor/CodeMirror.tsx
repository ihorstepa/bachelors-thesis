import { useState, useRef, useEffect } from 'react'
import ReactCodeMirror from '@uiw/react-codemirror'
import type { EditorView, ViewUpdate } from '@codemirror/view'
import type { JSX } from 'react'
import * as Y from 'yjs'

import { useService } from '@/contextProviders/ServiceProvider'
import { FileSyncManager } from '@/core/fileSyncManager'
import { PresenceService } from '@/core/presenceService'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import type { SharedFile } from '@/core/fileSyncManager'
import ExtensionProvider from './extensionProvider'
import { FileSystemManager, type NodeMeta } from '@/core/fileSystemManager'
import { useEditor } from '@/contextProviders/EditorProvider'
import Spinner from '@/components/Spinner/Spinner'
import type { NotifyFn } from './IdeNotification'
import { getLanguageName } from './extensions/language'

type Props = {
    fileId: string
    isActive: boolean
    canWrite: boolean
    onNotify: NotifyFn
}

function CodeMirror({ fileId, isActive, canWrite, onNotify }: Props): JSX.Element {
    const fileSystemManager = useService(FileSystemManager)
    const fileSyncManager = useService(FileSyncManager)
    const presenceService = useService(PresenceService)

    const [file, setFile] = useState<SharedFile | null>(null)
    const [meta, setMeta] = useState<NodeMeta | null>(null)
    const [isSynced, setIsSynced] = useState(false)
    const editorViewRef = useRef<EditorView | null>(null)
    const undoManagerRef = useRef<Y.UndoManager | null>(null)
    const { setEditorState, editorViewRef: sharedEditorViewRef, activeUndoManagerRef } = useEditor()

    const [extensionProvider] = useState(() => new ExtensionProvider())

    const clearSharedEditorBindings = () => {
        const currentView = editorViewRef.current
        if (sharedEditorViewRef.current === currentView) {
            sharedEditorViewRef.current = null
        }
        if (activeUndoManagerRef.current === undoManagerRef.current) {
            activeUndoManagerRef.current = null
        }
    }

    const setSharedEditorBindings = () => {
        const currentView = editorViewRef.current
        if (currentView) {
            sharedEditorViewRef.current = currentView
        }
        activeUndoManagerRef.current = undoManagerRef.current
    }

    const extensions =
        file && meta && undoManagerRef.current
            ? extensionProvider.getExtensions(
                  file,
                  meta,
                  (message) => {
                      onNotify('char-limit', 'warning', message)
                  },
                  undoManagerRef.current,
              )
            : []

    useEffect(() => {
        return fileSystemManager.on('rename', (id) => {
            if (id === fileId) {
                setMeta(fileSystemManager.getMeta(id))
            }
        })
    }, [fileId, fileSystemManager])

    useEffect(() => {
        if (!isActive || !meta) return
        const language = getLanguageName(meta.name)
        setEditorState((prev) => (prev.language === language ? prev : { ...prev, language }))
    }, [isActive, meta, setEditorState])

    useEffect(() => {
        const view = editorViewRef.current
        if (!view || !meta || !isSynced) return
        view.dispatch({ effects: extensionProvider.reconfigure(meta) })
    }, [meta, isSynced, extensionProvider])

    useAsyncEffect(
        async (isAborted) => {
            setIsSynced(false)
            const openedFile = await fileSyncManager.openFile(fileId)

            if (isAborted()) return
            undoManagerRef.current = new Y.UndoManager(openedFile.doc.getText())
            setFile(openedFile)
            setMeta(fileSystemManager.getMeta(fileId))

            // await file.synced

            if (isAborted()) return
            setIsSynced(true)
        },
        () => {
            fileSyncManager.closeFile(fileId)
            clearSharedEditorBindings()

            setFile(null)
            setMeta(null)
            setIsSynced(false)
            undoManagerRef.current = null
        },
        [fileId],
    )

    useEffect(() => {
        if (!file) return

        if (!isActive) {
            file.awareness.setLocalState(null)
            clearSharedEditorBindings()
        } else {
            editorViewRef.current?.focus()
            setSharedEditorBindings()
            const user = presenceService.setLocation(fileId)
            file.awareness.setLocalState({
                user: {
                    name: user.name,
                    color: user.color,
                },
            })
        }
    }, [isActive, file, fileId, presenceService, sharedEditorViewRef, activeUndoManagerRef])

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
        const nextLine = line.number
        const nextColumn = head - line.from + 1
        setEditorState((prev) => {
            if (prev.line === nextLine && prev.column === nextColumn && prev.selected === selected) {
                return prev
            }
            return {
                ...prev,
                line: nextLine,
                column: nextColumn,
                selected,
            }
        })
    }

    return (
        <ReactCodeMirror
            value={file.doc.getText().toString()}
            className='ide-editor'
            height='100%'
            width='100%'
            autoFocus={true}
            theme='none'
            basicSetup={false}
            readOnly={!canWrite}
            onUpdate={onUpdate}
            onCreateEditor={(view) => {
                editorViewRef.current = view
                if (isActive) {
                    setSharedEditorBindings()
                }
            }}
            extensions={extensions}
        />
    )
}

export default CodeMirror
