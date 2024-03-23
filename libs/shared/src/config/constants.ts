import { multiplayerMap, singleplayerMap } from '../maps'
import { GameMapName, GameMapData } from '../types'

export const SEPARATOR = ','
export const GAME_MAPS: Record<GameMapName, GameMapData> = {
  multiplayer: multiplayerMap,
  singleplayer: singleplayerMap,
}
