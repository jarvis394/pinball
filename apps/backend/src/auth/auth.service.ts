import { Injectable, UnauthorizedException } from '@nestjs/common'
import crypto from 'node:crypto'
import { ConfigService } from '../config/config.service'

export interface UserData {
  vkUserId: number
  vkAppId: number
  vkPlatform: string
}

@Injectable()
export class AuthService {
  constructor(private readonly configService: ConfigService) {}

  verify(searchOrParsedUrlQuery: string): UserData {
    let vkUserId: number = 0
    let vkAppId: number = 0
    let vkPlatform: string = ''
    let sign = ''
    let queryParams: Array<{
      key: string
      value: string
    }> = []

    // Проверка запускается ли приложение через ВК Игры
    const isGames = searchOrParsedUrlQuery.includes('sign_keys=')
    const gamesSignKeys: string[] = []

    /**
     * Функция, которая обрабатывает входящий query-параметр. В случае передачи
     * параметра, отвечающего за подпись, подменяет "sign". В случае встречи
     * корректного в контексте подписи параметра добавляет его в массив
     * известных параметров.
     * @param key
     * @param value
     */
    const processQueryParam = (key: string, value: string) => {
      if (typeof value === 'string') {
        if (key === 'sign') {
          sign = value
        } else if (key === 'sign_keys') {
          gamesSignKeys.push(...value.split(','))
        } else if (key.startsWith('vk_') || isGames) {
          if (key === 'vk_user_id') {
            vkUserId = Number(value)
          } else if (key === 'vk_app_id') {
            vkAppId = Number(value)
          } else if (key === 'vk_platform') {
            vkPlatform = value
          }

          queryParams.push({ key, value })
        }
      }
    }

    if (typeof searchOrParsedUrlQuery === 'string') {
      // Если строка начинается с вопроса (когда передан window.location.search),
      // его необходимо удалить.
      const formattedSearch = searchOrParsedUrlQuery.startsWith('?')
        ? searchOrParsedUrlQuery.slice(1)
        : searchOrParsedUrlQuery

      // Пытаемся спарсить строку как query-параметр.
      for (const param of formattedSearch.split('&')) {
        const key = param.split('=')[0]
        const value = param.replace(`${key}=`, '')
        if (key) processQueryParam(key, value)
      }
    } else {
      for (const key of Object.keys(searchOrParsedUrlQuery)) {
        const value = searchOrParsedUrlQuery[key]
        processQueryParam(key, value)
      }
    }

    if (isGames && gamesSignKeys.length > 0)
      queryParams = queryParams.filter(({ key }) => gamesSignKeys.includes(key))

    // Обрабатываем исключительный случай, когда не найдена ни подпись в параметрах,
    // ни один параметр, начинающийся с "vk_", дабы избежать
    // излишней нагрузки, образующейся в процессе работы дальнейшего кода.
    if (!sign || queryParams.length === 0) {
      throw new UnauthorizedException('Invalid VK signature')
    }
    // Снова создаём query в виде строки из уже отфильтрованных параметров.
    const queryString = queryParams
      // Сортируем ключи в порядке возрастания.
      .sort((a, b) => a.key.localeCompare(b.key))
      // Воссоздаём новый query в виде строки.
      .reduce((acc, { key, value }, idx) => {
        return (
          acc + (idx === 0 ? '' : '&') + `${key}=${encodeURIComponent(value)}`
        )
      }, '')

    const paramHashes = crypto
      .createHmac('sha256', this.configService.VK_APP_SECRET)
      .update(queryString)
      .digest()
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=$/, '')

    const success = paramHashes === sign

    if (!success || !vkUserId) {
      throw new UnauthorizedException('Invalid VK signature')
    }

    return {
      vkUserId,
      vkAppId,
      vkPlatform,
    }
  }
}
