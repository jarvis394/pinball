import { User } from '@prisma/client'

export enum GameEventName {
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

export type GameEventsMap = {
  [GameEventName.INIT]: InitEventData
  [GameEventName.UPDATE]: never
  [GameEventName.PLAYER_JOIN]: PlayerJoinEventData
  [GameEventName.PLAYER_LEFT]: PlayerLeftEventData
  [GameEventName.ACTIVATE_OBJECTS]: ActivateObjectsEventData
  [GameEventName.DEACTIVATE_OBJECTS]: DeactivateObjectsEventData
  [GameEventName.PING_OBJECTS]: PingObjectsEventData
  [GameEventName.PLAYER_LOST_ROUND]: PlayerLostRoundEventData
  [GameEventName.PLAYER_PINBALL_REDEPLOY]: PlayerPinballRedeployEventData
  [GameEventName.GAME_ENDED]: GameResultsEventData
  [GameEventName.GAME_STARTED]: GameStartedEventData
}

export type GameEventData = {
  time: number
  frame: number
  name: GameEventName
}

export type InitEventData = GameEventData & {
  name: GameEventName.INIT
  players: Record<string, User>
}

export type GameStartedEventData = GameEventData & {
  name: GameEventName.GAME_STARTED
  players: Record<string, User>
}

export enum GameResult {
  LOST = 0,
  WON = 1,
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

export type GameResultsEventData = GameEventData & {
  name: GameEventName.GAME_ENDED
  placements: GameResultsPlacement[]
  eloChange: Record<string, GameResultsEloChange>
}

export type ActivateObjectsEventData = GameEventData & {
  name: GameEventName.ACTIVATE_OBJECTS
  playerId: string
  labels: string[]
}

export type DeactivateObjectsEventData = GameEventData & {
  name: GameEventName.DEACTIVATE_OBJECTS
  playerId: string
  labels: string[]
}

export type PingObjectsEventData = GameEventData & {
  name: GameEventName.PING_OBJECTS
  playerId: string
  label: string
}

export type PlayerJoinEventData = GameEventData & {
  name: GameEventName.PLAYER_JOIN
  playerId: string
} & Omit<User, 'id'>

export type PlayerLeftEventData = GameEventData & {
  name: GameEventName.PLAYER_LEFT
  playerId: string
}

export type PlayerLostRoundEventData = GameEventData & {
  name: GameEventName.PLAYER_LOST_ROUND
  playerId: string
}

export type PlayerPinballRedeployEventData = GameEventData & {
  name: GameEventName.PLAYER_PINBALL_REDEPLOY
  playerId: string
  pinballId: string
}

export class GameEvent<T extends keyof GameEventsMap = GameEventName> {
  name: T
  data: GameEventsMap[T]

  constructor(name: T, data: GameEventsMap[T]) {
    this.name = name
    this.data = data
  }
}
