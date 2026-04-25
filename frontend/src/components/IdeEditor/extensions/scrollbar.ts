import { ViewPlugin } from '@codemirror/view'
import { OverlayScrollbars } from 'overlayscrollbars'

import { baseScrollbarOptions } from '@/components/OverlayScrollbar/baseScrollbarOptions'

export const overlayScrollbar = ViewPlugin.define((view) => {
    const scrollDOM = view.scrollDOM

    const osInstance = OverlayScrollbars(
        { target: scrollDOM, elements: { viewport: scrollDOM } },
        {
            overflow: { x: 'scroll', y: 'scroll' },
            scrollbars: { ...baseScrollbarOptions, theme: 'os-theme-ide' },
        },
    )

    return {
        destroy() {
            osInstance.destroy()
        },
    }
})
