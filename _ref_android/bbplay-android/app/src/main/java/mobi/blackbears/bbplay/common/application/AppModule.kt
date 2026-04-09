package mobi.blackbears.bbplay.common.application

import android.app.Application
import android.content.Context
import dagger.*
import mobi.blackbears.bbplay.common.data.network.CommonNetworkApi
import mobi.blackbears.bbplay.common.metrica.*
import mobi.blackbears.bbplay.common.preferences.PreferenceManager
import mobi.blackbears.bbplay.common.preferences.PreferenceManagerImpl
import retrofit2.Retrofit
import javax.inject.Singleton

@Module
class AppModule {

    @Singleton
    @Provides
    fun applicationContext(application: Application): Context = application.applicationContext

    @Singleton
    @Provides
    fun providePreferencesManager(context: Context): PreferenceManager =
        PreferenceManagerImpl(context)

    @Singleton
    @Provides
    fun provideCommonApi(retrofit: Retrofit): CommonNetworkApi =
        retrofit.create(CommonNetworkApi::class.java)

    @Singleton
    @Provides
    fun provideYandexMetricEventImpl(application: Application): YandexAppMetricEventImpl =
        YandexAppMetricEventImpl(application)

    @Singleton
    @Provides
    fun provideMetricInit(yandexFacadeImpl: YandexAppMetricEventImpl): MetricInit =
        yandexFacadeImpl

    @Singleton
    @Provides
    fun provideMetricEvent(yandexFacadeImpl: YandexAppMetricEventImpl): MetricEvent =
        yandexFacadeImpl

    @Singleton
    @Provides
    fun provideMetricManager(yandex: MetricEvent): MetricManager = MetricManagerImpl(yandex)
}