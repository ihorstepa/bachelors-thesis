import TextInput from '@/components/TextInput/TextInput'
import { IconChevron, IconFile } from '@/components/Icons/Icons'
import type { NodeType } from '@/types/nodes'

type FileTreeTextInputProps = {
    type: NodeType
    onConfirm: (name: string) => void
    onCancel: () => void
    indent: number
}

function FileTreeTextInput({ type, onConfirm, onCancel, indent }: FileTreeTextInputProps) {
    return (
        <div className='filetree-text-input-row' style={{ paddingLeft: `${indent}px` }}>
            <div className='filetree-row-icon'>{type === 'file' ? <IconFile /> : <IconChevron open={false} />}</div>
            <TextInput onConfirm={onConfirm} onCancel={onCancel} />
        </div>
    )
}

export default FileTreeTextInput
