import bridge from '@vkontakte/vk-bridge'

export type VKUserData = {
  fullname: string
  avatarUrl?: string
}

export type ClientEnginePlayerJson = {
  id: string
  elo: number
  highScore: number
  score: number
  currentScore: number
  vkUserData?: VKUserData
}

export class ClientEnginePlayer {
  id: string
  elo: number
  highScore: number
  score: number
  currentScore: number
  vkUserData?: VKUserData

  constructor(params: ClientEnginePlayerJson) {
    this.id = params.id
    this.elo = params.elo
    this.score = params.score
    this.highScore = params.highScore
    this.currentScore = params.currentScore
    this.vkUserData = params.vkUserData
  }

  async loadVkUserData() {
    const data = await bridge.send('VKWebAppGetUserInfo', {
      user_id: Number(this.id),
    })

    this.vkUserData = {
      avatarUrl: data.photo_200,
      fullname: [data.first_name, data.last_name].join(' '),
    }

    return this.vkUserData
  }

  toJSON(): ClientEnginePlayerJson {
    return {
      id: this.id,
      elo: this.elo,
      highScore: this.highScore,
      score: this.score,
      currentScore: this.currentScore,
      vkUserData: this.vkUserData,
    }
  }
}
