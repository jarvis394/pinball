import { Engine, GameEventName } from '@pinball/engine'
import Matter from 'matter-js'
import { Types } from '@geckos.io/snapshot-interpolation'
import { GameMapName } from '@pinball/shared'

export type SnapshotPinball = {
  id: string
  playerId: string
  positionX: number
  positionY: number
  velocityX: number
  velocityY: number
}

export type SnapshotEvent = {
  event: GameEventName
  data?: string
}

export interface Snapshot extends Types.Snapshot {
  id: Types.ID
  time: Types.Time
  mapName: GameMapName
  playerId: string
  playerScore: number
  playerHighScore: number
  playerCurrentScore: number
  mapActiveObjects: string[]
  events: SnapshotEvent[]
  state: {
    pinballs: SnapshotPinball[]
  }
}

export const generateSnapshot = (engine: Engine): Snapshot => {
  const player = engine.game.me
  const pinballs: SnapshotPinball[] = []
  const mapActiveObjects: string[] = []
  const events: SnapshotEvent[] = []

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

  engine.game.events.forEach((event) => {
    events.push({
      event: event.name,
      data: JSON.stringify(event.data),
    })
  })

  return {
    id: engine.frame.toString(),
    time: Date.now(),
    mapName: engine.game.world.mapName,
    playerId: player.id,
    playerScore: player.score,
    playerHighScore: player.highScore,
    playerCurrentScore: player.currentScore,
    mapActiveObjects,
    events,
    state: {
      pinballs,
    },
  }
}

type RestoreEngineFromSnapshotOptions = Partial<{
  restoreNonServerControlled: boolean
}>

export const restoreEngineFromSnapshot = (
  engine: Engine,
  snapshot: Snapshot,
  options?: RestoreEngineFromSnapshotOptions
) => {
  engine.frame = Number(snapshot.id)
  engine.frameTimestamp = snapshot.time
  engine.game.events = snapshot.events.map((event) => ({
    data: JSON.parse(event.data || ''),
    name: event.event,
  }))

  restorePlayerFromSnapshot(engine, snapshot)
  restorePinballsFromSnapshot(engine, snapshot.state.pinballs, options)
  restoreMapActiveObjectsFromSnapshot(engine, snapshot)
}

export const restorePlayerFromSnapshot = (
  engine: Engine,
  snapshot: Snapshot
) => {
  const enginePlayer = engine.game.world.players.get(snapshot.playerId)
  if (!enginePlayer) {
    return engine
  }

  enginePlayer.score = snapshot.playerScore
  enginePlayer.currentScore = snapshot.playerCurrentScore
  enginePlayer.highScore = snapshot.playerHighScore

  return engine
}

export const restoreMapActiveObjectsFromSnapshot = (
  engine: Engine,
  snapshot: Snapshot
) => {
  const { mapActiveObjects, playerId } = snapshot
  const player = engine.game.world.players.get(playerId)
  const map = engine.game.world.map

  if (!map || !player) return engine
  if (!player.isServerControlled) return

  map.activePaddles = new Set(mapActiveObjects)

  return engine
}

export const restorePinballsFromSnapshot = (
  engine: Engine,
  pinballs: Snapshot['state']['pinballs'],
  options?: RestoreEngineFromSnapshotOptions
) => {
  pinballs.forEach((snapshotPinball) => {
    const enginePinball = engine.game.world.pinballs.get(snapshotPinball.id)
    const enginePlayer = engine.game.world.players.get(snapshotPinball.playerId)

    if (!enginePinball || !enginePlayer) {
      return
    }

    if (
      !enginePlayer.isServerControlled &&
      !options?.restoreNonServerControlled
    ) {
      return
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

export const areSnapshotsClose = (snapshotA: Snapshot, snapshotB: Snapshot) => {
  let result = true

  for (const pinballA of snapshotA.state.pinballs) {
    const pinballB = snapshotB.state.pinballs.find((e) => e.id === pinballA.id)
    if (!pinballB) return

    const pinballAPosition = { x: pinballA.positionX, y: pinballA.positionY }
    const pinballBPosition = { x: pinballB.positionX, y: pinballB.positionY }
    const error = Math.abs(
      Matter.Vector.magnitude(
        Matter.Vector.sub(pinballAPosition, pinballBPosition)
      )
    )

    if (error > 1) {
      result = false
      break
    }
  }

  return result
}
