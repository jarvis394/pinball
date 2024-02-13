import React from 'react'
import useMountEffect from '../../hooks/useMountEffect'
import bridge from '@vkontakte/vk-bridge'
import { ConfigProvider, AdaptivityProvider, AppRoot } from '@vkontakte/vkui'
import { Outlet } from 'react-router-dom'
import { APP_MAX_WIDTH } from '../../config/constants'
import './App.css'

const AppUnmemoized: React.FC = () => {
  const component = <Outlet />

  useMountEffect(() => {
    bridge.send('VKWebAppInit')
  })

  return (
    <div
      className="App"
      style={{
        ['--appMaxWidth' as string]: APP_MAX_WIDTH + 'px',
      }}
    >
      <div className="App__content">
        <ConfigProvider isWebView appearance="dark">
          <AdaptivityProvider>
            <AppRoot mode="partial">{component}</AppRoot>
          </AdaptivityProvider>
        </ConfigProvider>
      </div>
    </div>
  )
}

export const App = React.memo(AppUnmemoized)
