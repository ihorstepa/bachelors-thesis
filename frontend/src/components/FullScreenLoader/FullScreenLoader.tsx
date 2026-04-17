import Spinner from '@/components/Spinner/Spinner'

import '@/components/FullScreenLoader/FullScreenLoader.css'

type FullScreenLoaderProps = {
    label?: string
}

function FullScreenLoader({ label }: FullScreenLoaderProps) {
    return (
        <div className='fullscreen-loader' role='status' aria-live='polite'>
            <Spinner size={30} />
            {label != null && label.trim().length > 0 && <span className='fullscreen-loader-label'>{label}</span>}
        </div>
    )
}

export default FullScreenLoader
