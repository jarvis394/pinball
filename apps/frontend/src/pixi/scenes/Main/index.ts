import { Engine, WorldEvents } from '@pinball/shared'
import { ClientEngine, ClientEngineEvents } from '../../../models/ClientEngine'
import Application from '../../Application'
import PIXIObject from '../../PIXIObject'
import Viewport from '../../components/Viewport'
import GameMap from '../../components/GameMap'
import Pinball from '../../components/Pinball'
import CurrentScore from '../../components/CurrentScore'
import { Debug } from '../../components/Debug'
import { ENABLE_DEBUG_OVERLAY } from '../../../config/constants'

class MainScene extends PIXIObject {
  pinballs: Map<string, Pinball>
  userId: string | null
  viewport: Viewport
  clientEngine: ClientEngine
  gameMap: GameMap
  currentScore: CurrentScore
  debugOverlay: Debug

  constructor(app: Application, engine: Engine) {
    super(app, engine)
    this.userId = this.getUserId()
    this.viewport = new Viewport(app, engine)
    this.clientEngine = new ClientEngine(engine, this.userId)
    this.gameMap = new GameMap(app, this.clientEngine)
    this.currentScore = new CurrentScore(engine)
    this.pinballs = new Map()
    this.debugOverlay = new Debug(this.clientEngine)

    this.viewport.addChild(this.gameMap.root)
    this.viewport.addChild(this.currentScore)

    if (ENABLE_DEBUG_OVERLAY) {
      this.viewport.addChild(this.debugOverlay)
    }

    this.addChild(this.viewport.root)

    this.clientEngine.init()
  }

  getUserId() {
    const params = new URLSearchParams(window.location.search)
    return params.get('vk_user_id')
  }

  override async init() {
    this.clientEngine.addEventListener(
      ClientEngineEvents.INIT_ROOM,
      this.handleInitRoom.bind(this)
    )
    this.clientEngine.engine.game.world.addEventListener(
      WorldEvents.PINBALL_SPAWN,
      this.handlePinballSpawn.bind(this)
    )
    this.clientEngine.engine.game.world.addEventListener(
      WorldEvents.PLAYER_SPAWN,
      this.handlePlayerSpawn.bind(this)
    )

    await this.clientEngine.startGame()

    // this.clientEngine.addEventListener(
    //   ClientEngineEvents.PLAYER_LEFT,
    //   this.handlePlayerLeft.bind(this)
    // )
  }

  handlePlayerSpawn(playerId: string) {
    console.log('[PIXI] MainScene: add player', playerId)
  }

  handlePinballSpawn(pinballId: string) {
    const enginePinball =
      this.clientEngine.engine.game.world.pinballs.get(pinballId)
    if (!enginePinball) {
      throw new Error(
        `pinballSpawn: Pinball with ID ${pinballId} does not exist in engine`
      )
    }

    const pixiPinball = new Pinball(enginePinball)
    this.pinballs.set(pinballId, pixiPinball)
    pixiPinball.init()
    this.viewport.addChild(pixiPinball)
  }

  handleInitRoom() {
    if (!this.clientEngine.engine.game.world.map) {
      throw new Error('No map loaded when trying to init room in PIXI')
    }

    this.gameMap.init()
    this.gameMap.mask && this.viewport.addChild(this.gameMap.mask)
    this.debugOverlay.init()
    this.currentScore.init()
    this.viewport.init()
  }

  override update(interpolation: number) {
    this.clientEngine.update()

    if (!this.clientEngine.engine.game.world.map) {
      return
    }

    this.viewport.fit(interpolation)
    this.pinballs.forEach((pinball) => pinball.update(interpolation))
    this.gameMap.update()
    this.currentScore.update()
    this.debugOverlay.update()
  }
}

export default MainScene
