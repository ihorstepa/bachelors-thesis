import { VscClose } from 'react-icons/vsc'

import ModalShell from '@/components/ModalShell/ModalShell'

import '@/components/AboutIdeModal/IdeAboutModal.css'

type Props = {
    onClose(): void
}

function IdeAboutModal({ onClose }: Props) {
    return (
        <ModalShell className='ide-about-modal' onClose={onClose} ariaLabelledBy='ide-about-modal-title'>
            <div className='ide-about-modal-header'>
                <h2 className='ide-about-modal-title' id='ide-about-modal-title'>
                    About
                </h2>
                <button type='button' className='ide-about-modal-close' onClick={onClose} aria-label='Close'>
                    <VscClose size={18} />
                </button>
            </div>
            <p>
                This is a lightweight IDE for C/C++ that runs directly in your browser and allows real-time
                collaboration in a shared workspace.
            </p>
            <p>
                It supports code compilation and execution with performance comparable to native environments. It uses a
                browser-based toolchain built around Clang compiled to WebAssembly targeting WASI and a simple virtual
                file system to run the code.
            </p>
            <p>
                The IDE still has some limitations compared to a full desktop environment. For example, not all language
                features may be available, debugging is not supported, and IDE language services are not yet supported.
            </p>
        </ModalShell>
    )
}

export default IdeAboutModal
