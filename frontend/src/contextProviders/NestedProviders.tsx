import React from 'react'

type ProviderComponent = React.ComponentType<{ children: React.ReactNode }>

type Props = {
    providers: ProviderComponent[]
    children: React.ReactNode
}

function NestedProviders({ providers, children }: Props): React.ReactNode {
    return providers.reduceRight((acc, Provider) => <Provider>{acc}</Provider>, children)
}

export default NestedProviders
