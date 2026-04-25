type ImportMetaEnv = Readonly<Record<string, string>>

interface ImportMeta {
    readonly env: ImportMetaEnv
}
