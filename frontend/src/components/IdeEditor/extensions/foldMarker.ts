import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { VscChevronDown, VscChevronRight } from 'react-icons/vsc'

const iconMarkup = {
    open: renderToStaticMarkup(createElement(VscChevronDown, { size: 15 })),
    closed: renderToStaticMarkup(createElement(VscChevronRight, { size: 15 })),
}

export const createFoldMarker = (open: boolean): HTMLElement => {
    const marker = document.createElement('span')
    marker.className = 'ide-fold-marker'
    marker.innerHTML = open ? iconMarkup.open : iconMarkup.closed
    return marker
}
