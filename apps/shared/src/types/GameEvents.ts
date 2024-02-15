import { User } from '@prisma/client'
import { GameResult } from '../engine'

export enum GameEvent {
  INIT = '0',
  UPDATE = '1',
  PLAYER_JOIN = '2',
  PLAYER_LEFT = '3',
  ACTIVATE_OBJECTS = '4',
  DEACTIVATE_OBJECTS = '5',
  PING_OBJECTS = '6',
  PLAYER_LOST_ROUND = '7',
  PLAYER_PINBALL_REDEPLOY = '8',
  GAME_ENDED = '9',
  GAME_STARTED = '10',
}

export type EventData = {
  time: number
  frame: number
}

export type InitEventData = {
  players: Record<string, User>
}

export type GameStartedEventData = {
  players: Record<string, User>
}

export type GameResultsPlacement = {
  playerId: string
  score: number
  highScore: number
  result: GameResult
}

export type GameResultsEloChange = {
  change: number
  elo: number
}

export type GameResultsEventData = {
  placements: GameResultsPlacement[]
  eloChange: Record<string, GameResultsEloChange>
}

export type ActivateObjectsEventData = EventData & {
  playerId: string
  labels: string[]
}

export type DeactivateObjectsEventData = EventData & {
  playerId: string
  labels: string[]
}

export type PingObjectsEventData = EventData & {
  playerId: string
  label: string
}

export type PlayerJoinEventData = EventData & {
  playerId: string
} & Omit<User, 'id'>

export type PlayerLeftEventData = EventData & {
  playerId: string
}

export type PlayerLostRoundEventData = EventData & {
  playerId: string
}

export type PlayerPinballRedeployEventData = EventData & {
  playerId: string
  pinballId: string
}
