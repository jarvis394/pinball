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
import { ConfigService } from '../config/config.service'

@Injectable()
export class ColyseusService implements OnApplicationShutdown {
  public server: Server | null = null
  private readonly logger = new Logger(ColyseusService.name)

  constructor(private readonly configService: ConfigService) {}

  createServer(httpServer: http.Server) {
    if (this.server) return

    const latency = this.configService.MULTIPLAYER_LATENCY_SIMULATION

    this.server = new Server({
      transport: new WebSocketTransport({
        server: httpServer,
      }),
      presence: new RedisPresence(),
      greet: false,
    })

    // Artificial latency controlled by env variable
    latency && this.server.simulateLatency(latency)
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
