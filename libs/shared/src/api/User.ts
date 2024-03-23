import { User } from '@prisma/client'

export type UserGetSelfReq = void
export type UserGetSelfRes = { user: User }
