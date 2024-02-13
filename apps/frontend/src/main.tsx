import * as ReactDOM from 'react-dom/client'
import { Router } from './components/Router'

// SVGPathSeg polyfill
import 'pathseg'

import '@vkontakte/vkui/dist/vkui.css'

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(<Router />)
