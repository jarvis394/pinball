import React, { useMemo } from 'react'
import useMountEffect from '../../hooks/useMountEffect'
import bridge from '@vkontakte/vk-bridge'
import { ConfigProvider, AdaptivityProvider, AppRoot } from '@vkontakte/vkui'
import { Outlet } from 'react-router-dom'
import { APP_MAX_WIDTH } from '../../config/constants'
import { useAppDispatch, useAppSelector } from '../../store'
import { fetchUserData, setUserBridgeData } from '../../store/user'
import { FullScreenSpinner } from '../FullScreenSpinner'
import './App.css'

const AppUnmemoized: React.FC = () => {
  const user = useAppSelector((store) => store.user.data)
  const dispatch = useAppDispatch()
  const component = useMemo(() => {
    if (user) {
      return <Outlet />
    } else {
      return <FullScreenSpinner />
    }
  }, [user])

  useMountEffect(() => {
    bridge.send('VKWebAppInit')
    bridge.send('VKWebAppGetUserInfo').then((data) => {
      dispatch(
        setUserBridgeData({
          fullname: [data.first_name, data.last_name].join(' '),
          avatarUrl: data.photo_200,
        })
      )
    })

    dispatch(fetchUserData())
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
