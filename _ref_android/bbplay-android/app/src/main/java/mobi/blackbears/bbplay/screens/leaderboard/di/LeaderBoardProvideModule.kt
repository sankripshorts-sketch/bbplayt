package mobi.blackbears.bbplay.screens.leaderboard.di

import mobi.blackbears.bbplay.screens.leaderboard.data.network.LeaderBoardApi
import dagger.*
import retrofit2.Retrofit

@Module
class LeaderBoardProvideModule {

    @LeaderBoardScope
    @Provides
    fun provideApi(retrofit: Retrofit): LeaderBoardApi = retrofit.create(LeaderBoardApi::class.java)
}