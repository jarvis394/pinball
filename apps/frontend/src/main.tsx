import * as ReactDOM from 'react-dom/client'
import { Router } from './components/Router'
import { Provider } from 'react-redux'
import store from './store'

// SVGPathSeg polyfill
import 'pathseg'

import '@vkontakte/vkui/dist/vkui.css'

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <Provider store={store}>
    <Router />
  </Provider>
)
