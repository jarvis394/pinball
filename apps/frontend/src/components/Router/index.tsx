import React from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { HashRouter } from 'react-router-dom'
import { App } from '../App'
import { routes } from '../../config/routes'

export const Router: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route element={<App />}>
          {Object.values(routes).map((route) => (
            <Route
              element={route.element}
              key={route.alias}
              path={route.path}
            />
          ))}
        </Route>
        <Route path="*" element={<Navigate to={routes.main.path} replace />} />
      </Routes>
    </HashRouter>
  )
}
