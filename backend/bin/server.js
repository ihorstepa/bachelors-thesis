#!/usr/bin/env node

import * as number from 'lib0/number'
import * as env from 'lib0/environment'
import * as yhub from '@y/hub'
import { createAuthModule } from '../src/api/auth/index.js'
import { createProjectsModule } from '../src/api/projects/index.js'
import { createPersistencePlugins, createRedisConfig } from './persistence.js'
import { logger } from '../src/logger.js'

const port = number.parseInt(env.ensureConf('port'))
logger.info({ port }, 'starting server')

const postgresUrl = env.ensureConf('postgres')
const persistence = createPersistencePlugins()
const redis = createRedisConfig()

const authModule = await createAuthModule({ postgresUrl })
const projectsModule = await createProjectsModule({
    postgresUrl,
    verifyAccessToken: authModule.verifyAccessToken,
})

const authPlugin = {
    ...authModule.authPlugin,
    ...projectsModule.authPolicy,
}

/** @param {{ app: import('uws').TemplatedApp, yhub: import('@y/hub').YHub }} ctx */
const setupApi = async (ctx) => {
    await authModule.setupApi(ctx)
    projectsModule.setupApi(ctx)
}

yhub.createYHub({
    redis,
    postgres: postgresUrl,
    persistence,
    server: {
        port,
        auth: authPlugin,
        onRoomUpdated: projectsModule.onRoomUpdated,
        setupApi,
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
