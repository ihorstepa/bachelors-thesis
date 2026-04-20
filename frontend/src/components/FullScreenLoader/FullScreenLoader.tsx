import Spinner from '@/components/Spinner/Spinner'

import '@/components/FullScreenLoader/FullScreenLoader.css'

type Props = {
    label?: string
}

function FullScreenLoader({ label }: Props) {
    return (
        <div className='fullscreen-loader' role='status' aria-live='polite'>
            <Spinner size={30} />
            {label != null && label.trim().length > 0 && <span className='fullscreen-loader-label'>{label}</span>}
        </div>
    )
}

export default FullScreenLoader
