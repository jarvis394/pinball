import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  ShutdownSignal,
  Type,
} from '@nestjs/common'
import { RedisPresence, Room, Server } from 'colyseus'
import { WebSocketTransport } from '@colyseus/ws-transport'
import * as http from 'http'

@Injectable()
export class ColyseusService implements OnApplicationShutdown {
  public server: Server | null = null
  private readonly logger = new Logger(ColyseusService.name)

  createServer(httpServer: http.Server) {
    if (this.server) return

    this.server = new Server({
      transport: new WebSocketTransport({
        server: httpServer,
      }),
      presence: new RedisPresence(),
      greet: false,
    })

    this.server.simulateLatency(100)
  }

  defineRoom(name: string, room: Type<Room>) {
    if (!this.server) return
    this.server?.define(name, room)
  }

  async listen(port: number): Promise<unknown> {
    if (!this.server) return
    return this.server.listen(port)
  }

  onApplicationShutdown(sig: ShutdownSignal) {
    if (!this.server) return
    this.logger.log(`Caught signal "${sig}", shutting down`)
    this.server.gracefullyShutdown()
  }
}
