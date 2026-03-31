#!/usr/bin/env node
import * as number from 'lib0/number'
import * as env from 'lib0/environment'
import * as yhub from '@y/hub'
import { logger } from '../src/logger.js'

const port = number.parseInt(env.getConf('port') || '3002')

logger.info({ port }, 'starting server')

yhub.createYHub({
    redis: {
        url: env.ensureConf('redis'),
        prefix: 'yhub',
        taskDebounce: 10000,
        minMessageLifetime: 60000,
    },
    postgres: env.ensureConf('postgres'),
    persistence: [],
    server: null,
    worker: {
        taskConcurrency: 5,
    },
})
