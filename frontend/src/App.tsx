import { Routes, Route } from 'react-router'

import '@/App.css'
import Dashboard from '@/pages/Dashboard/Dashboard'
import Ide from '@/pages/Ide/Ide'

function App() {
    return (
        <Routes>
            <Route path='/' element={<Dashboard />} />
            <Route path='/ide/:projectId?' element={<Ide />} />
        </Routes>
    )
}

export default App
