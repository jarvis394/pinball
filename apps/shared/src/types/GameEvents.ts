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
}

export type EventData = {
  time: number
  frame: number
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
}

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
