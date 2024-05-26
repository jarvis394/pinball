import React, { useMemo } from 'react'
import useMountEffect from '../../hooks/useMountEffect'
import bridge from '@vkontakte/vk-bridge'
import { ConfigProvider, AdaptivityProvider, AppRoot } from '@vkontakte/vkui'
import { Outlet } from 'react-router-dom'
import { APP_MAX_WIDTH, ENABLE_TEST_USER } from '../../config/constants'
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
    bridge.send('VKWebAppInit').catch(() => {
      console.warn(
        'Cannot initialize VK app through bridge, probably working on localhost'
      )
    })

    const getUserData = async () => {
      try {
        const userInfoResponse = await bridge.send('VKWebAppGetUserInfo')

        dispatch(
          setUserBridgeData({
            fullname: [
              userInfoResponse.first_name,
              userInfoResponse.last_name,
            ].join(' '),
            avatarUrl: userInfoResponse.photo_200,
          })
        )
      } catch (e) {
        console.error('While trying to fetch VK user data:', e)
      }
    }

    dispatch(fetchUserData())

    if (ENABLE_TEST_USER) {
      dispatch(
        setUserBridgeData({
          fullname: 'Test User',
        })
      )
      return
    }

    getUserData()
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
