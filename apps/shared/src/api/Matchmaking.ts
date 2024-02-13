import { matchMaker } from 'colyseus'

export type ApiError = {
  success: false
}

export type MatchmakingGetRoomReq = object
export type MatchmakingGetRoomRes =
  | {
      success: true
      reservation: matchMaker.SeatReservation
    }
  | ApiError

export type MatchmakingReconnectToRoomReq = {
  roomId: string
  sessionId: string
}
export type MatchmakingReconnectToRoomRes =
  | {
      success: true
      roomId: string
      sessionId: string
    }
  | ApiError
