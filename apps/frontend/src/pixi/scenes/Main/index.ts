import { WorldEvents } from '@pinball/engine'
import { ClientEngine, ClientEngineEvents } from '../../../models/ClientEngine'
import Application from '../../Application'
import PIXIObject from '../../PIXIObject'
import Viewport from '../../components/Viewport'
import GameMap from '../../components/GameMap'
import Pinball from '../../components/Pinball'
import CurrentScore from '../../components/CurrentScore'
import { Debug } from '../../components/Debug'
import Timer from '../../components/Timer'
import { VKUserData } from '../../../models/ClientEnginePlayer'
import {
  ENABLE_DEBUG_OVERLAY,
  ENABLE_TEST_USER,
} from '../../../config/constants'
import { DestroyOptions } from 'pixi.js'

type MainSceneProps = {
  app: Application
  localVKUserData?: VKUserData
}

class MainScene extends PIXIObject {
  pinballs: Map<string, Pinball>
  userId: string | null
  viewport: Viewport
  clientEngine: ClientEngine
  gameMap: GameMap
  currentScore: CurrentScore
  timer: Timer
  debugOverlay?: Debug

  constructor({ app, localVKUserData }: MainSceneProps) {
    super(app)
    this.userId = this.getUserId()
    this.clientEngine = new ClientEngine(this.userId, localVKUserData)
    this.viewport = new Viewport(app, this.clientEngine)
    this.gameMap = new GameMap(app, this.clientEngine)
    this.currentScore = new CurrentScore(this.clientEngine)
    this.timer = new Timer(app, this.clientEngine)
    this.pinballs = new Map()

    this.viewport.addChild(this.gameMap.root)
    this.viewport.addChild(this.currentScore)

    if (ENABLE_DEBUG_OVERLAY) {
      this.debugOverlay = new Debug(this.app, this.clientEngine)
      this.debugOverlay.addChildrenForViewport(
        this.viewport.addChild.bind(this.viewport)
      )
      this.debugOverlay.addChildrenForScene(this.addChild.bind(this))
    }

    this.addChild(this.viewport.root)
    this.addChild(this.timer)

    this.clientEngine.addEventListener(
      ClientEngineEvents.INIT_ROOM,
      this.handleInitRoom.bind(this)
    )
    this.clientEngine.addEventListener(
      ClientEngineEvents.PLAYER_JOIN,
      this.handlePlayerJoin.bind(this)
    )
    this.clientEngine.engine.game.world.addEventListener(
      WorldEvents.PINBALL_SPAWN,
      this.handlePinballSpawn.bind(this)
    )
    this.clientEngine.addEventListener(
      ClientEngineEvents.PLAYER_LEFT,
      this.handlePlayerLeft.bind(this)
    )
  }

  startGame() {
    this.clientEngine.startGame()
  }

  // TODO: rewrite to use redux store data
  getUserId() {
    if (ENABLE_TEST_USER) {
      return '1'
    }

    const params = new URLSearchParams(window.location.search)
    return params.get('vk_user_id')
  }

  handlePlayerJoin(playerId: string) {
    console.log('[PIXI] MainScene: player join', playerId)
  }

  handlePlayerLeft(playerId: string) {
    console.log('[PIXI] MainScene: player left', playerId)
  }

  handlePinballSpawn(pinballId: string) {
    const enginePinball =
      this.clientEngine.engine.game.world.pinballs.get(pinballId)
    if (!enginePinball) {
      throw new Error(
        `pinballSpawn: Pinball with ID ${pinballId} does not exist in engine`
      )
    }

    const pixiPinball = new Pinball(this.app, enginePinball)
    this.pinballs.set(pinballId, pixiPinball)
    pixiPinball.init()
    this.viewport.addChild(pixiPinball)
  }

  async handleInitRoom() {
    if (!this.clientEngine.engine.game.world.map) {
      throw new Error('No map loaded when trying to init room in PIXI')
    }

    this.gameMap.init()
    this.gameMap.mask && this.viewport.addChild(this.gameMap.mask)
    this.currentScore.init()
    this.viewport.init()
    await this.debugOverlay?.init()
    await this.timer.init()
  }

  override update(interpolation: number) {
    this.clientEngine.update()

    if (!this.clientEngine.engine.game.world.map) {
      return
    }

    this.pinballs.forEach((pinball) => pinball.update(interpolation))
    this.gameMap.update()
    this.currentScore.update()
    this.timer.update()
    this.debugOverlay?.update()
    this.viewport.update()
  }

  override destroy(options?: DestroyOptions | undefined): void {
    this.clientEngine.destroy()
    super.destroy(options)
  }
}

export default MainScene
