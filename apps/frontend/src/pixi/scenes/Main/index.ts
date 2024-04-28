import { Engine, WorldEvents } from '@pinball/engine'
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

type MainSceneProps = {
  app: Application
  engine: Engine
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

  constructor({ app, engine, localVKUserData }: MainSceneProps) {
    super(app, engine)
    this.userId = this.getUserId()
    this.viewport = new Viewport(app, engine)
    this.clientEngine = new ClientEngine(engine, this.userId, localVKUserData)
    this.gameMap = new GameMap(app, this.clientEngine)
    this.currentScore = new CurrentScore(engine)
    this.timer = new Timer(engine)
    this.pinballs = new Map()

    this.viewport.addChild(this.gameMap.root)
    this.viewport.addChild(this.currentScore)

    if (ENABLE_DEBUG_OVERLAY) {
      this.debugOverlay = new Debug(this.clientEngine)
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
    this.debugOverlay?.init()
    this.currentScore.init()
    this.timer.init()
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
    this.timer.update()
    this.debugOverlay?.update()
  }
}

export default MainScene
