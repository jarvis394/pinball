import React, { useEffect } from 'react'
import { useAppSelector } from '../../store'
import { useNavigate } from 'react-router-dom'
import { routes } from '../../config/routes'
import ResultsCard from './ResultsCard'
import { Button } from '../../components/Button'
import './Results.css'

const Results: React.FC = () => {
  const navigate = useNavigate()
  const results = useAppSelector((store) => store.matchmaking.gameResults)

  const handleNavigateToGame = () => {
    navigate(routes.game.path)
  }

  const handleNavigateToMain = () => {
    navigate(routes.main.path)
  }

  // Cannot show results if they are empty, navigate to Main
  useEffect(() => {
    if (!results) {
      navigate(routes.main.path)
    }
  }, [navigate, results])

  // Impossible state
  if (!results) return null

  return (
    <div className="Results">
      <div className="Results__content">
        <h1>Результаты</h1>
        <div className="Results__list">
          {results.placements.map((placement, i) => {
            const eloChange = results.eloChange[placement.playerId]
            const player = results.players[placement.playerId]

            if (!eloChange || !player) return null

            return (
              <ResultsCard
                key={placement.playerId}
                place={i + 1}
                placement={placement}
                eloChange={eloChange}
                player={player}
              />
            )
          })}
        </div>
      </div>
      <div className="Results__buttons">
        <Button
          variant="primary"
          Component={'a'}
          onClick={handleNavigateToGame}
        >
          новая игра
        </Button>
        <Button
          variant="secondary"
          Component={'a'}
          onClick={handleNavigateToMain}
        >
          на главную
        </Button>
      </div>
    </div>
  )
}

export default Results
