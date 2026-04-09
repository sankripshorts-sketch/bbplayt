package mobi.blackbears.bbplay.screens.settings.di

import mobi.blackbears.bbplay.screens.settings.data.network.SettingsApi
import dagger.Module
import dagger.Provides
import retrofit2.Retrofit

@Module
class SettingsApiModule {

    @SettingsScope
    @Provides
    fun provideApi(retrofit: Retrofit) : SettingsApi = retrofit.create(SettingsApi::class.java)
}