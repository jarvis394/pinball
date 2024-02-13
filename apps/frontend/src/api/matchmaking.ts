import { MatchmakingGetRoomReq, MatchmakingGetRoomRes } from '@pinball/shared'
import makeRequest from './makeRequest'

export const getRoom = async (data: MatchmakingGetRoomReq) => {
  return await makeRequest<MatchmakingGetRoomRes>({
    path: 'matchmaker',
    requestOptions: {
      method: 'post',
      data,
    },
  })
}

export const reconnectToRoom = async () => {
  return await makeRequest({
    path: 'matchmaker/reconnect',
    requestOptions: {
      method: 'post',
    },
  })
}
