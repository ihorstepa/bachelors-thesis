#!/usr/bin/env node

import * as number from 'lib0/number'
import * as env from 'lib0/environment'
import * as yhub from '@y/hub'
import { createAuthModule } from '../src/auth/index.js'
import { logger } from '../src/logger.js'

const port = number.parseInt(env.getConf('port') || '3002')

logger.info({ port }, 'starting server')

const postgresUrl = env.ensureConf('postgres')
const authModule = await createAuthModule({ postgresUrl })

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
        setupApi: authModule.setupApi,
    },
    worker: null,
})

process.on('SIGINT', () => {
    authModule.destroy()
    process.exit(0)
})

process.on('SIGTERM', () => {
    authModule.destroy()
    process.exit(0)
})
