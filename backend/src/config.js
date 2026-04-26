export const SERVER_MAX_PAYLOAD_BYTES = 10 * 1024 * 1024

export const PROJECT_MAX_ROOM_DOC_BYTES = 10 * 1024 * 1024
export const PROJECT_MAX_FILE_ROOMS = 100
export const PROJECT_MAX_PER_OWNER = 10
export const PROJECT_ROOT_DOCID = '__root__'
export const PROJECT_TOUCH_DEBOUNCE_MS = 10 * 1000
export const PROJECT_TOUCH_ATTEMPT_TTL_MS = 10 * 60 * 1000
export const PROJECT_TOUCH_CLEAN_UP_INTERVAL_MS = 60 * 1000
export const PROJECT_API_MAX_BODY_BYTES = 64 * 1024

// History-related APIs and nongc persistence are currently disabled for the prototype.
// The code is kept for possible future implementation of the history.
export const HISTORY_FEATURE_ENABLED = false
export const HISTORY_DISABLED_ERROR = 'History and non-GC document mode are currently disabled'
