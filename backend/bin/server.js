#!/usr/bin/env node

import * as number from 'lib0/number'
import * as env from 'lib0/environment'
import * as yhub from '@y/hub'
import { createAuthModule } from '../src/api/auth/index.js'
import { createProjectsModule } from '../src/api/projects/index.js'
import { logger } from '../src/logger.js'

const port = number.parseInt(env.getConf('port') || '3002')

logger.info({ port }, 'starting server')

const postgresUrl = env.ensureConf('postgres')
const authModule = await createAuthModule({ postgresUrl })
const projectsModule = await createProjectsModule({
    postgresUrl,
    verifyAccessToken: authModule.verifyAccessToken,
})

yhub.createYHub({
    redis: {
        url: env.ensureConf('redis'),
        prefix: 'yhub',
        taskDebounce: 10000,
        minMessageLifetime: 60000,
    },
    postgres: postgresUrl,
    persistence: [],
    server: {
        port,
        auth: authModule.authPlugin,
        /** @param {{ app: import('uws').TemplatedApp }} ctx */
        setupApi: async (ctx) => {
            await authModule.setupApi(ctx)
            projectsModule.setupApi(ctx)
        },
    },
    worker: null,
})

const shutdown = () => {
    projectsModule.destroy()
    authModule.destroy()
    process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
