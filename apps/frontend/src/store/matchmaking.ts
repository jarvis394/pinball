import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { FetchingState } from '../types/FetchingState'
import { getRoom } from '../api/matchmaking'
import { matchMaker } from 'colyseus'

export interface MatchmakingState {
  reservation: matchMaker.SeatReservation | null
  status: FetchingState
  fetchError: string | null
  currentRequestId?: string
}

export const initialState: MatchmakingState = {
  reservation: null,
  status: FetchingState.IDLE,
  fetchError: null,
}

export const fetchMatchmakingRoom = createAsyncThunk<
  matchMaker.SeatReservation | null,
  void
>('matchmaking/getRoom', async () => {
  const response = await getRoom({})
  return response.reservation
})

export const matchmakingSlice = createSlice({
  name: 'matchmaking',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMatchmakingRoom.pending, (state) => {
        state.status = FetchingState.PENDING
      })
      .addCase(fetchMatchmakingRoom.fulfilled, (state, action) => {
        state.status = FetchingState.FULFILLED
        state.reservation = action.payload
      })
      .addCase(fetchMatchmakingRoom.rejected, (state, action) => {
        state.status = FetchingState.REJECTED
        state.reservation = null
        state.fetchError = action.error.message || 'Internal Error'
      })
  },
})

export default matchmakingSlice.reducer
