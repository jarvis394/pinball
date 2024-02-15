import { Tappable, TappableProps, classNames as cx } from '@vkontakte/vkui'
import React from 'react'
import './Button.css'

type ButtonProps = TappableProps & {
  variant?: 'primary' | 'secondary' | 'default'
  fullWidth?: boolean
}

export const Button: React.FC<React.PropsWithChildren<ButtonProps>> = ({
  children,
  variant = 'default',
  fullWidth = false,
  className,
  ...props
}) => {
  return (
    <Tappable
      {...props}
      className={cx('Button', className, {
        'Button--primary': variant === 'primary',
        'Button--secondary': variant === 'secondary',
        'Button--fullWidth': fullWidth,
      })}
    >
      {children}
    </Tappable>
  )
}
