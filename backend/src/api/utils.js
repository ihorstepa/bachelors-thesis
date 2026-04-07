/**
 * @typedef {{
 *   maxBodyBytes: number,
 *   onAborted: () => Error,
 *   onPayloadTooLarge: () => Error,
 *   onInvalidJson: () => Error,
 * }} JsonBodyReadOptions
 */

/**
 * @typedef {{
 *   isKnownError: (err: unknown) => boolean,
 *   getStatus: (type: string) => string,
 *   internalErrorType: string,
 *   log: { error: (payload: object, message: string) => void },
 *   unexpectedMessage: string,
 * }} SendErrorOptions
 */

/**
 * @typedef {{
 *   sendJson: (status: string, body: object) => void,
 *   sendEmpty: (status: string) => void,
 *   readJsonBody: (options: JsonBodyReadOptions) => Promise<unknown>,
 *   sendError: (err: unknown, options: SendErrorOptions) => void,
 * }} ResponseContext
 */

/**
 * Creates per-request response helpers sharing one lifecycle state.
 * @param {import('uws').HttpResponse} res
 * @returns {ResponseContext}
 */
export const createResponseContext = (res) => {
    const state = createResponseState(res)
    const sendJson = createJsonSender(res, state)
    const sendEmpty = createEmptySender(res, state)

    return {
        sendJson,
        sendEmpty,
        /** @param {JsonBodyReadOptions} options */
        readJsonBody: (options) => readJsonBody(res, state, options),
        /** @param {unknown} err @param {SendErrorOptions} options */
        sendError: (err, options) => sendError(sendJson, err, options),
    }
}

/**
 * @param {import('uws').HttpResponse} res
 */
export const setCorsHeaders = (res) => {
    res.writeHeader('Access-Control-Allow-Origin', '*')
    res.writeHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS')
    res.writeHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

/**
 * @param {import('uws').HttpResponse} res
 */
const createResponseState = (res) => {
    const state = {
        aborted: false,
        completed: false,
    }
    res.onAborted(() => {
        state.aborted = true
    })
    return state
}

/**
 * @param {import('uws').HttpResponse} res
 * @param {{ aborted: boolean, completed: boolean }} state
 * @returns {(status: string, body: object) => void}
 */
const createJsonSender = (res, state) => {
    /**
     * @param {string} status
     * @param {object} body
     */
    return (status, body) => {
        if (state.aborted || state.completed) {
            return
        }
        state.completed = true
        res.cork(() => {
            res.writeStatus(status)
            setCorsHeaders(res)
            res.writeHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(body))
        })
    }
}

/**
 * @param {import('uws').HttpResponse} res
 * @param {{ aborted: boolean, completed: boolean }} state
 * @returns {(status: string) => void}
 */
const createEmptySender = (res, state) => {
    /** @param {string} status */
    return (status) => {
        if (state.aborted || state.completed) {
            return
        }
        state.completed = true
        res.cork(() => {
            res.writeStatus(status)
            setCorsHeaders(res)
            res.end()
        })
    }
}

/**
 * @param {import('uws').HttpResponse} res
 * @param {{ aborted: boolean, completed: boolean }} state
 * @param {JsonBodyReadOptions} options
 * @returns {Promise<unknown>}
 */
const readJsonBody = (res, state, options) =>
    new Promise((resolve, reject) => {
        let settled = false
        /** @type {Buffer[]} */
        const chunks = []
        let totalBytes = 0

        /** @param {unknown} value */
        const finishResolve = (value) => {
            if (settled) {
                return
            }
            settled = true
            resolve(value)
        }

        /** @param {unknown} err */
        const finishReject = (err) => {
            if (settled) {
                return
            }
            settled = true
            reject(err)
        }

        res.onData((chunk, isLast) => {
            if (state.aborted) {
                finishReject(options.onAborted())
                return
            }
            if (state.completed || settled) {
                return
            }
            const buf = Buffer.from(chunk)
            totalBytes += buf.byteLength

            if (totalBytes > options.maxBodyBytes) {
                finishReject(options.onPayloadTooLarge())
                return
            }

            chunks.push(buf)

            if (!isLast) {
                return
            }

            try {
                const raw = Buffer.concat(chunks).toString('utf8')
                finishResolve(raw.length === 0 ? {} : JSON.parse(raw))
            } catch {
                finishReject(options.onInvalidJson())
            }
        })
    })

/**
 * @param {(status: string, body: object) => void} sendJson
 * @param {unknown} err
 * @param {SendErrorOptions} options
 */
const sendError = (sendJson, err, options) => {
    if (options.isKnownError(err)) {
        const known = /** @type {{ type: string, message?: string }} */ (err)
        sendJson(options.getStatus(known.type), {
            error: {
                type: known.type,
                ...(known.message != null && known.message.length > 0 ? { message: known.message } : {}),
            },
        })
        return
    }

    options.log.error({ err }, options.unexpectedMessage)
    sendJson(options.getStatus(options.internalErrorType), {
        error: { type: options.internalErrorType },
    })
}
