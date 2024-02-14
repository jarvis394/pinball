import { MatchmakingGetRoomReq, MatchmakingGetRoomRes } from '@pinball/shared'
import makeRequest from './makeRequest'

export const getRoom = async (data: MatchmakingGetRoomReq) => {
  return await makeRequest<MatchmakingGetRoomRes>({
    path: 'matchmaking',
    requestOptions: {
      method: 'get',
      data,
    },
  })
}

export const reconnectToRoom = async () => {
  return await makeRequest({
    path: 'matchmaking/reconnect',
    requestOptions: {
      method: 'get',
    },
  })
}
