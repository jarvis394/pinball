import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
import { combineReducers, configureStore } from '@reduxjs/toolkit'

import matchmakingReducer from './matchmaking'
import userReducer from './user'

const rootReducer = combineReducers({
  matchmaking: matchmakingReducer,
  user: userReducer,
})

const store = configureStore({
  reducer: rootReducer,
  devTools: true,
})

export default store

export type RootDispatch = typeof store.dispatch
export type RootState = ReturnType<typeof rootReducer>

type DispatchFunc = () => RootDispatch
export const useAppDispatch: DispatchFunc = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
