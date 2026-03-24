import { useState, useEffect, createContext, useContext } from 'react'
import { useService } from '@/core/ServiceContainer'
import { IFileSystemManager } from '@/core/interfaces/fileSystemManager'
import { useTabs } from '@/hooks/useTabs'
import type { NullableString } from '@/utils/types'
import type { NodeType } from '@/core/interfaces/fileSystemManager'

export type FileTreeNode = {
    id: NullableString
    name: string
    type: NodeType
    parentId: NullableString
    children: FileTreeNode[]
}

export type CreatingState = { parentId: NullableString; type: NodeType } | null

function buildTree(service: IFileSystemManager, parentId: NullableString): FileTreeNode {
    return {
        id: parentId,
        name: '',
        type: 'dir',
        parentId: null,
        children: [...service.getChildrenMeta(parentId)]
            .sort((a, b) => {
                if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
                return a.name.localeCompare(b.name)
            })
            .map((child) => ({
                id: child.id,
                name: child.name,
                type: child.type,
                parentId: child.parentId,
                children: child.type === 'dir' ? buildTree(service, child.id).children : [],
            })),
    }
}

export function useFileTreeState() {
    const fileSystemManager = useService(IFileSystemManager)
    const { activeId, openTab, closeTab } = useTabs()
    const [tree, setTree] = useState<FileTreeNode>(() => buildTree(fileSystemManager, null))
    const [creating, setCreating] = useState<CreatingState>(null)
    const [openDirs, setOpenDirs] = useState<Set<string>>(new Set())

    useEffect(() => {
        const refresh = () => setTree(buildTree(fileSystemManager, null))
        refresh()
        fileSystemManager.onChange(refresh)
    }, [fileSystemManager])

    const startCreating = (parentId: NullableString, type: NodeType) => setCreating({ parentId, type })

    const cancelCreating = () => setCreating(null)

    const confirmCreate = (name: string) => {
        if (!creating || !name.trim()) return setCreating(null)
        try {
            fileSystemManager.create(name.trim(), creating.type, creating.parentId)
        } catch (e) {
            console.error(e)
        }
        setCreating(null)
    }

    const deleteNode = (id: string) => {
        try {
            const collectIds = (nodeId: string): string[] => {
                const meta = fileSystemManager.getMeta(nodeId)
                if (meta.type === 'file') return [nodeId]
                return [...fileSystemManager.getChildrenMeta(nodeId).flatMap((child) => collectIds(child.id))]
            }

            const ids = collectIds(id)
            fileSystemManager.remove(id)
            ids.forEach((fileId) => closeTab(fileId))
        } catch (e) {
            console.error(e)
        }
    }

    const toggleDir = (id: string) => {
        setOpenDirs((prev) => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    return {
        tree,
        activeId,
        selectFile: openTab,
        creating,
        startCreating,
        cancelCreating,
        confirmCreate,
        deleteNode,
        openDirs,
        toggleDir,
    }
}

type FileTreeState = ReturnType<typeof useFileTreeState>

export const FileTreeContext = createContext<FileTreeState | null>(null)

export function useFileTree(): FileTreeState | null {
    return useContext(FileTreeContext)
}
