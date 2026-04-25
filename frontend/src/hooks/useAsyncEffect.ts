import { useEffect } from 'react'

function useAsyncEffect(
    effect: (isAborted: () => boolean) => Promise<void>,
    destroy?: () => void,
    deps?: React.DependencyList,
): void {
    useEffect(() => {
        let aborted = false
        const isAborted = () => aborted

        effect(isAborted).catch((error) => {
            if (!aborted) {
                throw error
            }
        })

        return () => {
            aborted = true
            destroy?.()
        }
    }, deps) // eslint-disable-line react-hooks/exhaustive-deps
}

export default useAsyncEffect
