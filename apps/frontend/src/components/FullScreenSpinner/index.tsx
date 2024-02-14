import { Spinner } from '@vkontakte/vkui'
import React from 'react'
import './FullScreenSpinner.css'

export const FullScreenSpinner: React.FC = () => {
  return (
    <div className="FullScreenSpinner">
      <Spinner size="large" />
    </div>
  )
}
