package mobi.blackbears.bbplay.screens.login.di

import mobi.blackbears.bbplay.screens.login.data.network.LoginApi
import dagger.*
import retrofit2.Retrofit

@Module
class LoginApiModule {

    @LoginScope
    @Provides
    fun api(retrofit: Retrofit): LoginApi = retrofit.create(LoginApi::class.java)
}