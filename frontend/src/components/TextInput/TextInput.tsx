import '@/components/TextInput/TextInput.css'

import { useRef } from 'react'

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
                    if (val) {
                        onConfirm(val)
                    } else {
                        onCancel()
                    }
                } else if (e.key === 'Escape') {
                    onCancel()
                }
            }}
        />
    )
}

export default TextInput
