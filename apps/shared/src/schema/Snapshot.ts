import { Engine } from '../engine'
import Matter from 'matter-js'
import { Types } from '@geckos.io/snapshot-interpolation'
import { GameMapName } from '../types'

export type SnapshotPinball = {
  id: string
  playerId: string
  positionX: number
  positionY: number
  velocityX: number
  velocityY: number
}

export interface Snapshot extends Types.Snapshot {
  id: Types.ID
  time: Types.Time
  mapName: GameMapName
  playerId: string
  playerHighScore: number
  playerCurrentScore: number
  mapActiveObjects: string[]
  state: {
    pinballs: SnapshotPinball[]
  }
}

export const generateSnapshot = (engine: Engine): Snapshot => {
  const player = engine.game.me
  const pinballs: SnapshotPinball[] = []
  const mapActiveObjects: string[] = []

  if (!engine.game.world.map || !engine.game.world.mapName) {
    throw new Error('generateSnapshot: No map loaded')
  }

  if (!player) {
    throw new Error('generateSnapshot: No local player is set')
  }

  engine.game.world.pinballs.forEach((pinball) => {
    pinballs.push({
      id: pinball.id,
      positionX: pinball.body.position.x,
      positionY: pinball.body.position.y,
      velocityX: pinball.body.velocity.x,
      velocityY: pinball.body.velocity.y,
      playerId: pinball.playerId,
    })
  })

  engine.game.world.map?.activePaddles.forEach((label) => {
    mapActiveObjects.push(label)
  })

  return {
    id: engine.frame.toString(),
    time: Date.now(),
    mapName: engine.game.world.mapName,
    playerId: player.id,
    playerHighScore: player.highScore,
    playerCurrentScore: player.currentScore,
    mapActiveObjects,
    state: {
      pinballs,
    },
  }
}

export const restoreEngineFromSnapshot = (
  engine: Engine,
  snapshot: Snapshot
) => {
  engine.frame = Number(snapshot.id)
  engine.frameTimestamp = snapshot.time

  restorePlayerFromSnapshot(engine, snapshot)
  restorePinballsFromSnapshot(engine, snapshot.state.pinballs)
  restoreMapActiveObjectsFromSnapshot(engine, snapshot.mapActiveObjects)
}

export const restorePlayerFromSnapshot = (
  engine: Engine,
  snapshot: Snapshot
) => {
  const enginePlayer = engine.game.world.players.get(snapshot.playerId)
  if (!enginePlayer) {
    console.warn(
      `restorePlayerFromSnapshot: Engine does not have player with ID ${snapshot.playerId}`
    )
    return engine
  }

  enginePlayer.currentScore = snapshot.playerCurrentScore
  enginePlayer.highScore = snapshot.playerHighScore

  return engine
}

export const restoreMapActiveObjectsFromSnapshot = (
  engine: Engine,
  mapActiveObjects: Snapshot['mapActiveObjects']
) => {
  const map = engine.game.world.map
  if (!map) return engine

  map.activePaddles = new Set(mapActiveObjects)

  return engine
}

export const restorePinballsFromSnapshot = (
  engine: Engine,
  pinballs: Snapshot['state']['pinballs']
) => {
  pinballs.forEach((snapshotPinball) => {
    let enginePinball = engine.game.world.pinballs.get(snapshotPinball.id)

    if (!enginePinball) {
      console.warn(
        `restorePinballsFromSnapshot: Engine does not have pinball with ID ${snapshotPinball.id}`
      )
      enginePinball = engine.game.world.addPinballForPlayer(
        snapshotPinball.id,
        snapshotPinball.playerId
      )
    }

    Matter.Body.setPosition(
      enginePinball.body,
      Matter.Vector.create(snapshotPinball.positionX, snapshotPinball.positionY)
    )
    Matter.Body.setVelocity(
      enginePinball.body,
      Matter.Vector.create(snapshotPinball.velocityX, snapshotPinball.velocityY)
    )
  })
}
