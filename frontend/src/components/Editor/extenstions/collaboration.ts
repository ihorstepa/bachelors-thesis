import type { Extension } from '@codemirror/state'
import { yCollab } from 'y-codemirror.next'

import collaborationService from '@/services/collaborationService'

function collaboration(): Extension {
    const session = collaborationService.connect('my-project/content')
    return yCollab(session.text, session.awareness)
}

export default collaboration
