import React from 'react'
import { ClientEnginePlayerJson } from '../../models/ClientEnginePlayer'
import { Avatar, classNames as cx } from '@vkontakte/vkui'
import formatWordByNumber from '../../utils/formatWordByNumber'
import LoadingDots from '../../components/LoadingDots'

type PlayerInfoProps = {
  player?: ClientEnginePlayerJson
  reverseRows?: boolean
}

const PlayerInfo: React.FC<PlayerInfoProps> = ({ player, reverseRows }) => {
  const scoreWord = formatWordByNumber(
    player?.score || 0,
    'очко',
    'очка',
    'очков'
  )

  if (!player) {
    return (
      <div className="Game__playerInfoContainer Game__playerInfoContainer--waiting">
        Ожидание игрока
        <LoadingDots />
      </div>
    )
  }

  return (
    <div
      className={cx('Game__playerInfoContainer', {
        'Game__playerInfoContainer--reverseRows': reverseRows,
      })}
    >
      <div className="Game__playerInfoUserRow">
        <Avatar
          size={24}
          src={player.vkUserData?.avatarUrl}
          initials={player.vkUserData?.fullname.slice(0, 1)}
        />
        <h1>{player.vkUserData?.fullname}</h1>
        <p>{player.elo} ELO</p>
      </div>
      <div className="Game__playerInfoPlayerInfoRow">
        <div className="Game__playerInfoScore">
          {player.score} {scoreWord}
        </div>
        <div className="Game__playerInfoHighScoreContainer">
          <span>Лучший счёт</span>
          <div className="Game__playerInfoHighScore">{player.highScore}</div>
        </div>
      </div>
    </div>
  )
}

export default React.memo(PlayerInfo)
