import { UserGetSelfRes } from '@pinball/shared'
import makeRequest from './makeRequest'

export const getSelf = async () => {
  return await makeRequest<UserGetSelfRes>({
    path: 'user',
    requestOptions: {
      method: 'get',
    },
  })
}
