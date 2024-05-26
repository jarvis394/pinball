import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { VKUserData } from '../models/ClientEnginePlayer'
import { FetchingState } from '../types/FetchingState'
import { getSelf } from '../api/user'
import { User } from '@prisma/client'

export interface UserState {
  data: User | null
  bridgeData: VKUserData | null
  status: FetchingState
  fetchError: string | null
  currentRequestId?: string
}

export const initialState: UserState = {
  data: null,
  bridgeData: null,
  status: FetchingState.IDLE,
  fetchError: null,
}

export const fetchUserData = createAsyncThunk<User, void>(
  'user/getSelf',
  async () => {
    const response = await getSelf()
    return response.user
  }
)

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserBridgeData(
      state,
      { payload }: PayloadAction<UserState['bridgeData']>
    ) {
      state.bridgeData = payload
    },
    setUserElo(state, { payload }: PayloadAction<number>) {
      if (!state.data) return

      state.data.elo = payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserData.pending, (state, action) => {
        state.status = FetchingState.PENDING
        state.currentRequestId = action.meta.requestId
      })
      .addCase(fetchUserData.fulfilled, (state, action) => {
        const { requestId } = action.meta
        if (
          state.status === FetchingState.PENDING &&
          state.currentRequestId === requestId
        ) {
          state.status = FetchingState.FULFILLED
          state.data = action.payload
        }
      })
      .addCase(fetchUserData.rejected, (state, action) => {
        const { requestId } = action.meta
        if (
          state.status === FetchingState.PENDING &&
          state.currentRequestId === requestId
        ) {
          state.status = FetchingState.REJECTED
          state.data = null
          state.fetchError = action.error.message || 'Internal Error'
        }
      })
  },
})

export const { setUserBridgeData, setUserElo } = userSlice.actions

export default userSlice.reducer
