import React from 'react'
import { Link } from 'react-router-dom'
import Field from '../../components/svg/Field'
import Logo from '../../components/svg/Logo'
import { Avatar } from '@vkontakte/vkui'
import './Main.css'

const Main: React.FC = () => {
  return (
    <div className="Main">
      <div className="Main__logoContainer">
        <Field className="Main__field" />
        <Logo className="Main__logo" />
      </div>
      <div className="Main__userContainer">
        <Avatar size={48} src="" initials="ВЕ" />
        <div className="Main__userContent">
          <h1>Владислав Екушев</h1>
          <p>0 ELO</p>
        </div>
      </div>
      <Link to="/game" className="Main__startGame">
        играть
      </Link>
    </div>
  )
}

export default Main
