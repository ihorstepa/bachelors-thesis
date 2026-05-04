declare module '@/workers/languageServer/clangd.js' {
    export type ClangdFS = {
        analyzePath(path: string): { exists: boolean }
        mkdir(path: string): void
        writeFile(path: string, data: string): void
        unlink(path: string): void
        rename(oldPath: string, newPath: string): void
    }

    export type ClangdModule = {
        FS: ClangdFS
        callMain(args: string[]): void
    }

    type ClangdOptions = {
        thisProgram?: string
        locateFile?: (path: string) => string
        instantiateWasm?: (
            imports: WebAssembly.Imports,
            receiveInstance: (instance: WebAssembly.Instance, module: WebAssembly.Module) => void,
        ) => WebAssembly.Exports
        stdinReady?: () => Promise<void>
        stdin?: () => number | null
        stdout?: (charCode: number) => void
        stderr?: (charCode: number) => void
        onExit?: () => void
        onAbort?: () => void
    }

    const Clangd: (options: ClangdOptions) => Promise<ClangdModule>
    export default Clangd
}
