export type LanguageServerWorkerInMessage =
    | { type: 'lsp'; payload: string }
    | { type: 'sync'; path: string; content: string }
    | { type: 'delete'; path: string }
    | { type: 'rename'; oldPath: string; newPath: string }

export type LanguageServerWorkerOutMessage =
    | { type: 'ready' }
    | { type: 'lsp'; payload: unknown }
    | { type: 'error'; message: string }
