package mobi.blackbears.bbplay.screens.login.di

import android.content.Context
import dagger.Module
import dagger.Provides
import mobi.blackbears.bbplay.screens.login.data.preferences.CredentialsManager
import mobi.blackbears.bbplay.screens.login.data.preferences.CredentialsManagerImpl

@Module
class CredentialsModule {

    @LoginScope
    @Provides
    fun provideCredentialsManager(context: Context): CredentialsManager =
        CredentialsManagerImpl(context)
}