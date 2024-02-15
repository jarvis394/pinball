import React from 'react'
import { ClientEnginePlayerJson } from '../../models/ClientEnginePlayer'
import { GameResultsEloChange, GameResultsPlacement } from '@pinball/shared'
import { Avatar, classNames as cx } from '@vkontakte/vkui'
import formatWordByNumber from '../../utils/formatWordByNumber'
import './ResultsCard.css'

type ResultsCardProps = {
  player: ClientEnginePlayerJson
  placement: GameResultsPlacement
  eloChange: GameResultsEloChange
  place: number
}

const ResultsCard: React.FC<ResultsCardProps> = ({
  eloChange,
  place,
  placement,
  player,
}) => {
  const scoreWord = formatWordByNumber(
    placement.score || 0,
    'очко',
    'очка',
    'очков'
  )

  return (
    <div className="ResultsCard">
      <div className="ResultsCard__userBlock">
        <Avatar
          size={48}
          src={player.vkUserData?.avatarUrl}
          initials={player.vkUserData?.fullname}
        />
        <div className="ResultsCard__userBlockInfoContainer">
          <h1>{player.vkUserData?.fullname}</h1>
          <p>
            {eloChange.elo} ELO{' '}
            <span
              className={cx('ResultsCard__eloChange', {
                'ResultsCard__eloChange--positive': eloChange.change > 0,
                'ResultsCard__eloChange--negative': eloChange.change < 0,
              })}
            >
              {eloChange.change > 0 && '+'}
              {eloChange.change}
            </span>
          </p>
        </div>
        <div
          className={cx('ResultsCard__placement', {
            'ResultsCard__placement--first': place === 1,
            'ResultsCard__placement--second': place === 2,
            'ResultsCard__placement--third': place === 3,
          })}
        >
          {place}
        </div>
      </div>
      <div className="ResultsCard__scoresBlock">
        <div className="ResultsCard__score">
          {placement.score} {scoreWord}
        </div>
        <div className="ResultsCard__highScoreContainer">
          <span>Лучший счёт</span>
          <div className="ResultsCard__highScore">{placement.highScore}</div>
        </div>
      </div>
    </div>
  )
}

export default React.memo(ResultsCard)
