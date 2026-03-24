import '@/components/Spinner/Spinner.css'

type SpinnerProps = {
    size?: number
}

function Spinner({ size = 20 }: SpinnerProps) {
    return <div className='spinner' style={{ width: size, height: size }} />
}

export default Spinner
