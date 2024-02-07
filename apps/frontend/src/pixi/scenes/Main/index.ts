import { Engine } from '@pinball/engine'
import Application from '../../Application'
import Player from '../../components/Player'
import PIXIObject from '../../PIXIObject'
import Viewport from './Viewport'
import { ClientEngine } from '../../../models/ClientEngine'
import GameMap from './GameMap'

class MainScene extends PIXIObject {
  players: Map<string, Player>
  playerId: string | null
  viewport: Viewport
  clientEngine: ClientEngine
  gameMap: GameMap

  constructor(app: Application, engine: Engine) {
    super(app, engine)
    const params = new URLSearchParams(window.location.search)
    this.players = new Map()
    this.playerId = params.get('id')
    this.viewport = new Viewport(app, engine)
    this.clientEngine = new ClientEngine(engine, this.playerId)
    this.gameMap = new GameMap(app, engine)

    this.viewport.addChild(this.gameMap.root)

    const player = this.engine.game.world.addPlayer(this.playerId || '')
    this.engine.game.setMe(player)

    this.engine.game.world.players.forEach((player) => {
      const pixiPlayer = new Player(player)
      this.players.set(player.id, pixiPlayer)
      this.viewport.addChild(pixiPlayer)
    })

    this.addChild(this.viewport.root)

    this.clientEngine.init()
    this.clientEngine.engine.start()
  }

  // handleInitRoom(snapshot: Snapshot) {
  //   if (!this.playerId) return

  //   Object.values(snapshot.state.players).forEach((serverPlayer) => {
  //     const enginePlayer = this.clientEngine.engine.game.world.getPlayerByID(
  //       serverPlayer.id
  //     )

  //     if (!enginePlayer) {
  //       throw new Error(
  //         `При событии "${ClientEngineEvents.INIT_ROOM}" не получилось найти игрока в движке с ID ${serverPlayer.id}`
  //       )
  //     }

  //     const pixiPlayer = new Player(enginePlayer)
  //     this.players.set(serverPlayer.id, pixiPlayer)
  //     this.viewport.addChild(pixiPlayer)
  //   })

  //   Object.values(snapshot.state.bullets).forEach((serverBullet) => {
  //     const engineBullet = this.clientEngine.engine.game.world.getBulletByID(
  //       serverBullet.id
  //     )

  //     if (!engineBullet) {
  //       throw new Error(
  //         `При событии "${ClientEngineEvents.INIT_ROOM}" не получилось найти пульку в движке с ID ${serverBullet.id}`
  //       )
  //     }

  //     const pixiBullet = new Bullet(engineBullet)
  //     this.bullets.set(serverBullet.id, pixiBullet)
  //     this.viewport.addChild(pixiBullet)
  //   })
  // }

  // handlePlayerJoin(serverPlayer: SnapshotPlayer) {
  //   if (!this.playerId) return

  //   const enginePlayer = this.clientEngine.engine.game.world.getPlayerByID(
  //     serverPlayer.id
  //   )

  //   if (!enginePlayer) {
  //     throw new Error(
  //       `При событии "${ClientEngineEvents.PLAYER_JOIN}" не получилось найти игрока в движке с ID ${serverPlayer.id}`
  //     )
  //   }

  //   const pixiPlayer = new Player(enginePlayer)
  //   this.players.set(enginePlayer.id, pixiPlayer)
  //   this.viewport.addChild(pixiPlayer)
  // }

  // handlePlayerLeft(playerId: string) {
  //   if (!this.playerId) return

  //   const pixiPlayer = this.viewport.children.find((e) => {
  //     if (e instanceof Player && e.enginePlayer.id === playerId) {
  //       return e
  //     }
  //   })

  //   if (!pixiPlayer) {
  //     throw new Error(`На stage не найден объект Player с id ${playerId}`)
  //   }

  //   this.viewport.removeChild(pixiPlayer)
  //   this.players.delete(playerId)
  // }

  override async init() {
    await this.clientEngine.startGame()

    this.gameMap.render()

    // this.clientEngine.addEventListener(
    //   ClientEngineEvents.INIT_ROOM,
    //   this.handleInitRoom.bind(this)
    // )
    // this.clientEngine.addEventListener(
    //   ClientEngineEvents.PLAYER_JOIN,
    //   this.handlePlayerJoin.bind(this)
    // )
    // this.clientEngine.addEventListener(
    //   ClientEngineEvents.PLAYER_LEFT,
    //   this.handlePlayerLeft.bind(this)
    // )
  }

  override update(interpolation: number) {
    this.players.forEach((player) => {
      player.update(interpolation)
    })

    this.viewport.fit(interpolation)
  }
}

export default MainScene
