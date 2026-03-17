import ReactCodeMirror from '@uiw/react-codemirror'

import '@/components/Editor/Editor.css'
import getExtensions from '@/components/Editor/extensions.ts'

function Editor() {
    return (
        <ReactCodeMirror
            // value={}
            className='ide-editor'
            height='100%'
            // minHeight={}
            // maxHeight={}
            width='100%'
            // minWidth={}
            // maxWidth={}
            autoFocus={true}
            // placeholder={}
            theme='none'
            basicSetup={false}
            editable={true}
            readOnly={false}
            // indentWithTab={}
            // onChange={}
            // onStatistics={}
            // onUpdate={}
            // onCreateEditor={}
            extensions={getExtensions()}
            // root={}
            // initialState={}
        />
    )
}

export default Editor
