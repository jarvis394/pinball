import axios, { AxiosRequestConfig } from 'axios'
import { BACKEND_URL } from '../config/constants'

interface Arguments {
  /** API method as an URL path */
  path: string

  /** Query parameters */
  params?: Record<string, string>

  /** Axios request options */
  requestOptions?: AxiosRequestConfig
}

export default async <T = never>({
  path,
  params,
  requestOptions,
}: Arguments): Promise<T> => {
  const baseUrl = import.meta.env.DEV ? '/api' : BACKEND_URL
  const headers = {
    Authorization: `Bearer ${window.location.search.split('?')[1]}`,
  }

  return (
    await axios({
      method: requestOptions?.method || 'get',
      url: baseUrl + '/' + path,
      params,
      headers,
      ...requestOptions,
    })
  ).data as T
}
