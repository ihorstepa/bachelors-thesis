import '@/components/Spinner/Spinner.css'

type Props = {
    size?: number
}

function Spinner({ size = 20 }: Props) {
    return <div className='spinner' style={{ width: size, height: size }} />
}

export default Spinner
