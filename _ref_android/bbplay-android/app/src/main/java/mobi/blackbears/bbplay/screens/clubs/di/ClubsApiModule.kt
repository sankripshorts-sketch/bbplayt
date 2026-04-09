package mobi.blackbears.bbplay.screens.clubs.di

import mobi.blackbears.bbplay.screens.clubs.data.network.ClubsApi
import dagger.Module
import dagger.Provides
import retrofit2.Retrofit

@Module
class ClubsApiModule {

    @ClubsScope
    @Provides
    fun provideApi(retrofit: Retrofit): ClubsApi = retrofit.create(ClubsApi::class.java)
}