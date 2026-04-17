import type { EditorView, Panel, ViewUpdate } from '@codemirror/view'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { IconType } from 'react-icons'
import {
    VscArrowDown,
    VscArrowUp,
    VscCaseSensitive,
    VscChevronDown,
    VscChevronRight,
    VscClose,
    VscRegex,
    VscReplace,
    VscReplaceAll,
    VscWholeWord,
} from 'react-icons/vsc'
import {
    SearchQuery,
    closeSearchPanel,
    findNext,
    findPrevious,
    getSearchQuery,
    replaceAll,
    replaceNext,
    setSearchQuery,
} from '@codemirror/search'

type IconButton = HTMLButtonElement & { iconRoot?: Root }

function createIconButton(
    title: string,
    icon: IconType,
    mountedRoots: Root[],
    className: string = 'ide-search-btn',
): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = className
    button.setAttribute('aria-label', title)
    button.title = title

    const iconWrap = document.createElement('span')
    iconWrap.className = 'ide-search-btn-icon'
    iconWrap.setAttribute('aria-hidden', 'true')
    button.append(iconWrap)

    const root = createRoot(iconWrap)
    root.render(createElement(icon, { size: 14 }))
    mountedRoots.push(root)
    ;(button as IconButton).iconRoot = root

    return button
}

function updateQuery(
    view: EditorView,
    searchValue: string,
    replaceValue: string,
    options: { caseSensitive: boolean; wholeWord: boolean; regexp: boolean },
): void {
    const nextQuery = new SearchQuery({
        search: searchValue,
        replace: replaceValue,
        caseSensitive: options.caseSensitive,
        wholeWord: options.wholeWord,
        regexp: options.regexp,
    })
    const current = getSearchQuery(view.state)

    if (!nextQuery.eq(current)) {
        view.dispatch({ effects: setSearchQuery.of(nextQuery) })
    }
}

function countMatches(view: EditorView, query: SearchQuery): { total: number; current: number } {
    const main = view.state.selection.main
    let total = 0
    let current = 0
    const cursor = query.getCursor(view.state)

    while (true) {
        const step = cursor.next()
        if (step.done) {
            break
        }
        const match = step.value
        total += 1
        if (match.from === main.from && match.to === main.to) {
            current = total
        }
        if (total >= 9999) {
            break
        }
    }

    return { total, current }
}

function renderStatus(view: EditorView, status: HTMLElement): void {
    const query = getSearchQuery(view.state)

    if (!query.search) {
        status.textContent = 'No results'
        return
    }

    if (!query.valid) {
        status.textContent = 'No results'
        return
    }

    const { total, current } = countMatches(view, query)

    if (total === 0) {
        status.textContent = 'No results'
        return
    }

    status.textContent = `${current > 0 ? current : '?'} of ${total}`
}

export function createCustomSearchPanel(view: EditorView): Panel {
    const mountedRoots: Root[] = []

    const dom = document.createElement('div')
    dom.className = 'ide-search-panel'

    const toggleReplace = createIconButton('Toggle replace', VscChevronRight, mountedRoots) as IconButton
    toggleReplace.classList.add('ide-search-toggle')

    const findRow = document.createElement('div')
    findRow.className = 'ide-search-row ide-search-row-find'

    const findBox = document.createElement('div')
    findBox.className = 'ide-search-box'

    const replaceRow = document.createElement('div')
    replaceRow.className = 'ide-search-row ide-search-row-replace hidden'

    const replaceBox = document.createElement('div')
    replaceBox.className = 'ide-search-box ide-search-box-replace'

    const findInput = document.createElement('input')
    findInput.className = 'ide-search-input'
    findInput.name = 'search'
    findInput.placeholder = 'Find'
    findInput.setAttribute('main-field', 'true')

    const replaceInput = document.createElement('input')
    replaceInput.className = 'ide-search-input'
    replaceInput.name = 'replace'
    replaceInput.placeholder = 'Replace'

    const status = document.createElement('span')
    status.className = 'ide-search-status'

    const caseButton = createIconButton('Match case', VscCaseSensitive, mountedRoots)
    const wholeWordButton = createIconButton('Match whole word', VscWholeWord, mountedRoots)
    const regexButton = createIconButton('Use regular expression', VscRegex, mountedRoots)
    const previousButton = createIconButton('Find previous', VscArrowUp, mountedRoots)
    const nextButton = createIconButton('Find next', VscArrowDown, mountedRoots)
    const closeButton = createIconButton('Close search', VscClose, mountedRoots)

    const replaceOneButton = createIconButton(
        'Replace current match',
        VscReplace,
        mountedRoots,
        'ide-search-btn ide-search-action',
    )

    const replaceAllButton = createIconButton(
        'Replace all matches',
        VscReplaceAll,
        mountedRoots,
        'ide-search-btn ide-search-action',
    )

    findBox.append(findInput, caseButton, wholeWordButton, regexButton)

    findRow.append(findBox, status, previousButton, nextButton, closeButton)

    replaceBox.append(replaceInput)
    replaceRow.append(replaceBox, replaceOneButton, replaceAllButton)
    dom.append(toggleReplace, findRow, replaceRow)

    const applyFromUI = () => {
        updateQuery(view, findInput.value, replaceInput.value, {
            caseSensitive: caseButton.classList.contains('active'),
            wholeWord: wholeWordButton.classList.contains('active'),
            regexp: regexButton.classList.contains('active'),
        })
        renderStatus(view, status)
    }

    const syncFromState = () => {
        const query = getSearchQuery(view.state)

        if (findInput.value !== query.search) {
            findInput.value = query.search
        }

        if (replaceInput.value !== query.replace) {
            replaceInput.value = query.replace
        }

        caseButton.classList.toggle('active', query.caseSensitive)
        wholeWordButton.classList.toggle('active', query.wholeWord)
        regexButton.classList.toggle('active', query.regexp)

        renderStatus(view, status)
    }

    const toggleOption = (button: HTMLButtonElement) => {
        button.classList.toggle('active')
        applyFromUI()
    }

    const runFindNext = () => {
        applyFromUI()
        findNext(view)
        renderStatus(view, status)
    }

    const runFindPrevious = () => {
        applyFromUI()
        findPrevious(view)
        renderStatus(view, status)
    }

    const close = () => {
        closeSearchPanel(view)
        view.focus()
    }

    toggleReplace.addEventListener('click', () => {
        const expanded = !replaceRow.classList.contains('hidden')
        replaceRow.classList.toggle('hidden', expanded)
        dom.classList.toggle('replace-open', !expanded)
        toggleReplace.iconRoot?.render(createElement(expanded ? VscChevronRight : VscChevronDown, { size: 14 }))
    })

    caseButton.addEventListener('click', () => toggleOption(caseButton))
    wholeWordButton.addEventListener('click', () => toggleOption(wholeWordButton))
    regexButton.addEventListener('click', () => toggleOption(regexButton))
    previousButton.addEventListener('click', runFindPrevious)
    nextButton.addEventListener('click', runFindNext)
    closeButton.addEventListener('click', close)

    replaceOneButton.addEventListener('click', () => {
        applyFromUI()
        replaceNext(view)
        renderStatus(view, status)
    })

    replaceAllButton.addEventListener('click', () => {
        applyFromUI()
        replaceAll(view)
        renderStatus(view, status)
    })

    findInput.addEventListener('input', applyFromUI)
    replaceInput.addEventListener('input', applyFromUI)

    findInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault()
            if (event.shiftKey) {
                runFindPrevious()
            } else {
                runFindNext()
            }
        } else if (event.key === 'Escape') {
            event.preventDefault()
            close()
        }
    })

    replaceInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault()
            applyFromUI()
            replaceNext(view)
            renderStatus(view, status)
        } else if (event.key === 'Escape') {
            event.preventDefault()
            close()
        }
    })

    syncFromState()

    const focusHandle = requestAnimationFrame(() => {
        findInput.focus()
        findInput.select()
    })

    return {
        dom,
        top: true,
        update(update: ViewUpdate) {
            if (update.docChanged || update.selectionSet) {
                syncFromState()
            }
        },
        destroy() {
            cancelAnimationFrame(focusHandle)
            mountedRoots.forEach((root) => root.unmount())
        },
    }
}
