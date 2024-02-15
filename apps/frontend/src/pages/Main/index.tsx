import React from 'react'
import { useNavigate } from 'react-router-dom'
import Field from '../../components/svg/Field'
import Logo from '../../components/svg/Logo'
import { Avatar } from '@vkontakte/vkui'
import { useAppSelector } from '../../store'
import { Button } from '../../components/Button'
import { routes } from '../../config/routes'
import './Main.css'

const Main: React.FC = () => {
  const navigate = useNavigate()
  const bridgeData = useAppSelector((store) => store.user.bridgeData)
  const user = useAppSelector((store) => store.user.data)

  const handleNavigateToGame = () => {
    navigate(routes.game.path)
  }

  return (
    <div className="Main">
      <div className="Main__logoContainer">
        <Field className="Main__field" />
        <Logo className="Main__logo" />
      </div>
      <div className="Main__userContainer">
        <Avatar
          size={48}
          src={bridgeData?.avatarUrl}
          initials={bridgeData?.fullname}
        />
        <div className="Main__userContent">
          <h1>{bridgeData?.fullname}</h1>
          <p>{user?.elo} ELO</p>
        </div>
      </div>
      <Button
        Component={'a'}
        variant="primary"
        fullWidth
        onClick={handleNavigateToGame}
      >
        играть
      </Button>
    </div>
  )
}

export default Main
