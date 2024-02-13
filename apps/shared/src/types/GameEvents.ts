import { Player } from '../engine'
import { GameRoomState } from '../schema/GameRoom'

export enum GameEvent {
  INIT = '0',
  UPDATE = '1',
  PLAYER_JOIN = '2',
  PLAYER_LEFT = '3',
  ACTIVATE_OBJECTS = '4',
  DEACTIVATE_OBJECTS = '5',
}

export interface InitEventMessage {
  playerId: Player['id']
  snapshot: GameRoomState
  frame: number
}

// export type PlayerJoinEventMessage = SnapshotPlayer

// export type PlayerLeftEventMessage = SnapshotPlayer['id']
