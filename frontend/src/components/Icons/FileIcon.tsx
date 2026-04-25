import '@/components/Icons/Icons.css'

import type { JSX } from 'react'
import type { IconType } from 'react-icons'
import { VscFile, VscFileCode, VscJson, VscMarkdown, VscTextSize } from 'react-icons/vsc'

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
