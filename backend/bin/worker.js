#!/usr/bin/env node
import * as env from 'lib0/environment'
import * as yhub from '@y/hub'
import { createPersistencePlugins, createRedisConfig } from './persistence.js'
import { createDocCompactedHook } from '../src/api/projects/index.js'
import { logger } from '../src/logger.js'

logger.info('starting worker')

const persistence = createPersistencePlugins()
const redis = createRedisConfig()
const postgres = env.ensureConf('postgres')

yhub.createYHub({
    redis,
    postgres,
    persistence,
    server: null,
    worker: {
        taskConcurrency: 5,
        events: {
            docUpdate: createDocCompactedHook(postgres),
        },
    },
})
