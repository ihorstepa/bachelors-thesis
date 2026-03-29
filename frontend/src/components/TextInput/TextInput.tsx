import { useRef } from 'react'

import '@/components/TextInput/TextInput.css'

type Props = {
    onConfirm: (name: string) => void
    onCancel: () => void
}

function TextInput({ onConfirm, onCancel }: Props) {
    const ref = useRef<HTMLInputElement>(null)

    return (
        <input
            ref={ref}
            className='text-input'
            autoFocus
            onBlur={() => onCancel()}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    const val = ref.current?.value.trim() ?? ''
                    val ? onConfirm(val) : onCancel()
                } else if (e.key === 'Escape') {
                    onCancel()
                }
            }}
        />
    )
}

export default TextInput
