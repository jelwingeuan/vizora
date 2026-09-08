import './App.css'
import './interface-polish.css'
import './release-hardening.css'

import {
  AccessGate,
} from './components/access/AccessGate'

import {
  AppLayout,
} from './components/layout/AppLayout'


function App() {
  return (
    <AccessGate>
      <AppLayout />
    </AccessGate>
  )
}


export default App