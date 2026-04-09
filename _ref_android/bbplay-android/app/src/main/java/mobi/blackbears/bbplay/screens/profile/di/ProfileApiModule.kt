package mobi.blackbears.bbplay.screens.profile.di

import mobi.blackbears.bbplay.screens.profile.data.network.ProfileApi
import dagger.Module
import dagger.Provides
import retrofit2.Retrofit

@Module
class ProfileApiModule {

    @ProfileScope
    @Provides
    fun provideApi(retrofit: Retrofit): ProfileApi = retrofit.create(ProfileApi::class.java)
}