import { matchMaker } from 'colyseus'

export type MatchmakingGetRoomReq = object
export type MatchmakingGetRoomRes = {
  reservation: matchMaker.SeatReservation
}

export type MatchmakingReconnectToRoomReq = {
  roomId: string
  sessionId: string
}
export type MatchmakingReconnectToRoomRes = {
  roomId: string
  sessionId: string
}
