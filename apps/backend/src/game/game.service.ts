import { Injectable, OnApplicationShutdown } from '@nestjs/common'
import { WebSocketTransport } from '@colyseus/ws-transport'
import { Server, Room } from 'colyseus'
import { PrismaClient } from '@prisma/client'
import * as http from 'http'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Type<T> = new (...args: any[]) => T

export const prismaClient = new PrismaClient()

@Injectable()
export class GameService implements OnApplicationShutdown {
  server: Server | null = null

  createServer(httpServer: http.Server) {
    if (this.server) return

    this.server = new Server({
      greet: false,
      transport: new WebSocketTransport({
        server: httpServer,
      }),
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defineRoom(name: string, room: Type<Room<any, any>>) {
    this.server?.define(name, room)
  }

  async listen(port: number): Promise<unknown> {
    if (!this.server) return
    return this.server.listen(port)
  }

  onApplicationShutdown(sig: string) {
    if (!this.server) return
    console.info(
      `Caught signal ${sig}. Game service shutting down on ${new Date()}.`
    )
    this.server.gracefullyShutdown()
  }
}
