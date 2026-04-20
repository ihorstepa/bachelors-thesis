import * as number from 'lib0/number'
import * as env from 'lib0/environment'
import { S3PersistenceV1 } from '@y/hub/plugins/s3'

/**
 * Build persistence plugins from environment.
 *
 * @returns {import('../src/types.js').PersistencePlugin[]}
 */
export const createPersistencePlugins = () => {
    const s3Bucket = env.getConf('S3_YHUB_BUCKET')
    if (s3Bucket == null || s3Bucket.length === 0) {
        return []
    }
    return [
        new S3PersistenceV1({
            bucket: s3Bucket,
            endPoint: env.ensureConf('S3_ENDPOINT'),
            port: number.parseInt(env.ensureConf('S3_PORT')),
            useSSL: env.getConf('S3_SSL') === 'true',
            accessKey: env.ensureConf('S3_ACCESS_KEY'),
            secretKey: env.ensureConf('S3_SECRET_KEY'),
        }),
    ]
}
