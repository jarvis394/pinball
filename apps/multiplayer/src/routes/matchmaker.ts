import express from 'express'
import { matchMaker } from 'colyseus'
import { vkAuthMiddleware } from '../middlewares/vkAuth'
import UserRequest from '../interfaces/userRequest'
import { UnauthorizedError } from '../utils/errors'
import { GameRoom } from '../rooms'
import { MatchmakingGetRoomRes, MatchmakingGetRoomReq } from '@pinball/shared'

matchMaker.controller.exposedMethods = ['joinById', 'reconnect']

export const matchmakerRouter = express.Router()

matchmakerRouter.use(vkAuthMiddleware)

matchmakerRouter.post<'/', never, MatchmakingGetRoomRes, MatchmakingGetRoomReq>(
  '/',
  async (req: UserRequest, res) => {
    const userId = req.user?.id.toString()

    if (!userId) {
      throw new UnauthorizedError('Unauthorized')
    }

    try {
      const reservation = await matchMaker.joinOrCreate(GameRoom.name, {
        userId,
      })
      res.json({
        success: true,
        reservation,
      })
    } catch (e) {
      console.error(e)
      res.json({
        success: false,
      })
    }
  }
)

matchmakerRouter.post('/reconnect', async (req: UserRequest, res) => {
  const userId = req.user?.id
  const { roomId, sessionId } = req.body

  if (!userId) {
    throw new UnauthorizedError('Unauthorized')
  }

  try {
    const reservation = await matchMaker.joinById(roomId, {
      userId,
      sessionId,
    })
    res.json({
      success: true,
      roomId: reservation.room.roomId,
      sessionId: reservation.sessionId,
    })
  } catch (e) {
    console.error(e)
    res.json({
      success: false,
    })
  }
})
