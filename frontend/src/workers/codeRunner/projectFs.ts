import { Directory } from '@wasmer/sdk'

export class ProjectFs {
    public readonly dir: Directory
    public readonly buildDir: string
    public readonly objDir: string
    public readonly wasmOutPath: string
    public readonly runCwd: string

    public constructor(projectFs: Record<string, Uint8Array>, entrypoint: string) {
        this.dir = new Directory(projectFs)
        const entrypointDir = entrypoint.includes('/') ? entrypoint.slice(0, entrypoint.lastIndexOf('/')) : ''
        this.buildDir = entrypointDir ? `__build__/${entrypointDir}` : '__build__'
        this.objDir = `${this.buildDir}/obj`
        this.wasmOutPath = `${this.buildDir}/main.wasm`
        this.runCwd = entrypointDir ? `/project/${entrypointDir}` : '/project'
    }

    public getObjectPath(sourcePath: string): string {
        const sanitized = sourcePath.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')
        return `${this.objDir}/__obj__${sanitized}.o`
    }

    public async prepareDirs(): Promise<void> {
        await this.createDir(this.buildDir)
        await this.createDir(this.objDir)
    }

    private async createDir(path: string): Promise<void> {
        const parts = path.split('/').filter(Boolean)
        let current = ''
        for (const part of parts) {
            current = current ? `${current}/${part}` : part
            try {
                await this.dir.createDir(current)
            } catch {}
        }
    }
}
