import React from 'react'
import './LoadingDots.css'

type LoadingDotsProps = {
  /** Animation duration in ms */
  duration?: number
}

const LoadingDots: React.FC<LoadingDotsProps> = ({ duration = 3000 }) => {
  return (
    <span
      className="LoadingDots"
      style={{ ['--loadingDuration' as string]: duration + 'ms' }}
    />
  )
}

export default LoadingDots
