import React from 'react'
import { Link } from 'react-router-dom'
import Field from '../../components/svg/Field'
import Logo from '../../components/svg/Logo'
import { Avatar } from '@vkontakte/vkui'
import './Main.css'
import { useAppSelector } from '../../store'

const Main: React.FC = () => {
  const bridgeData = useAppSelector((store) => store.user.bridgeData)
  const user = useAppSelector((store) => store.user.data)

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
      <Link to="/game" className="Main__startGame">
        играть
      </Link>
    </div>
  )
}

export default Main
