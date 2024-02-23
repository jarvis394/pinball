import { Pinball, Snapshot, SnapshotPinball } from '@pinball/shared'
import { ClientEngine } from '../../../models/ClientEngine'
import * as PIXI from 'pixi.js'

export class PinballDebug extends PIXI.Container {
  clientEngine: ClientEngine
  pinballs: Map<string, PIXI.Graphics>

  constructor(clientEngine: ClientEngine) {
    super()
    this.clientEngine = clientEngine
    this.pinballs = new Map()
  }

  init() {}

  addPinball(snapshotPinball: SnapshotPinball, enginePinball: Pinball) {
    const pixiPinball = new PIXI.Graphics()
      .lineStyle(4, 'ff0000', 0.5)
      .drawCircle(0, 0, enginePinball.data.radius)
    pixiPinball.zIndex = 100
    pixiPinball.name = snapshotPinball.id
    this.pinballs.set(snapshotPinball.id, pixiPinball)
    this.addChild(pixiPinball)

    return pixiPinball
  }

  update() {
    const snapshot = this.clientEngine.snapshots.vault.get() as
      | Snapshot
      | undefined
    if (!snapshot) return

    snapshot.state.pinballs.forEach((snapshotPinball) => {
      const enginePinball = this.clientEngine.engine.game.world.pinballs.get(
        snapshotPinball.id
      )
      let pixiPinball = this.pinballs.get(snapshotPinball.id)

      if (!pixiPinball && enginePinball) {
        pixiPinball = this.addPinball(snapshotPinball, enginePinball)
      }

      pixiPinball?.position.set(
        snapshotPinball.positionX,
        snapshotPinball.positionY
      )
    })

    // Remove deleted pinballs
    this.children.forEach((pinball, i) => {
      if (!pinball.name) return
      if (snapshot.state.pinballs.some((e) => e.id === pinball.name)) return

      this.pinballs.delete(pinball.name)
      this.removeChildAt(i)
    })
  }
}
