import { VscJson, VscMarkdown, VscFile, VscFileCode, VscTextSize } from 'react-icons/vsc'
import type { IconType } from 'react-icons'
import type { JSX } from 'react'

import '@/components/Icons/Icons.css'

const iconMap: Record<string, IconType> = {
    c: VscFileCode,
    h: VscFileCode,
    hpp: VscFileCode,
    hxx: VscFileCode,
    cpp: VscFileCode,
    cxx: VscFileCode,
    json: VscJson,
    md: VscMarkdown,
    txt: VscTextSize,
}

type Props = {
    filename: string
}

function FileIcon({ filename }: Props): JSX.Element {
    const ext = filename.lastIndexOf('.') === -1 ? '' : filename.split('.').pop()?.toLowerCase()
    const Icon = ext ? iconMap[ext] : null

    if (!Icon) {
        return <VscFile className='file-icon file-icon-default' />
    }

    return <Icon className={`file-icon file-icon-${ext}`} />
}

export default FileIcon
