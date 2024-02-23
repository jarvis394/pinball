import Main from '../pages/Main'
import Game from '../pages/Game'
import React from 'react'
import Results from '../pages/Results'

export type RouteAlias = 'main' | 'game' | 'results' | 'singleplayerGame'

export type Route<Alias extends RouteAlias = RouteAlias> = {
  alias: Alias
  path: string
  element: React.ReactNode
}

export const routes: {
  [Alias in RouteAlias]: Route<Alias>
} = {
  main: {
    alias: 'main',
    path: '/',
    element: <Main />,
  },
  game: {
    alias: 'game',
    path: '/game',
    element: <Game />,
  },
  singleplayerGame: {
    alias: 'singleplayerGame',
    path: '/singleplayer',
    element: <Game singleplayer />,
  },
  results: {
    alias: 'results',
    path: '/results',
    element: <Results />,
  },
}
