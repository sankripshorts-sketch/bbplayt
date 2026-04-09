package mobi.blackbears.bbplay.screens.news.di

import dagger.*
import mobi.blackbears.bbplay.BuildConfig
import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.screens.news.data.model.VkNewsResponse
import mobi.blackbears.bbplay.screens.news.data.network.*
import mobi.blackbears.bbplay.screens.news.domain.model.VkInfo
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import timber.log.Timber

@Module
class NewsNetworkModule {

    @[NewsScope Provides VkQualifier]
    fun gsonConverterFactory(): GsonConverterFactory = GsonConverterFactory.create()

    @[NewsScope Provides VkQualifier]
    fun provideHttpLoggingInterceptor(): HttpLoggingInterceptor =
        HttpLoggingInterceptor() { message: String? -> Timber.i("VK_LOG_BODY $message") }
            .setLevel(HttpLoggingInterceptor.Level.BODY)

    @[NewsScope Provides]
    fun provideRequestInterceptor() = RequestVkInterceptor()

    @[NewsScope Provides VkQualifier]
    fun provideOkHttpClient(
        requestInterceptor: RequestVkInterceptor,
        @VkQualifier httpLogInterceptor: HttpLoggingInterceptor
    ): OkHttpClient =
        OkHttpClient.Builder()
            .addInterceptor(requestInterceptor)
            .addInterceptor(httpLogInterceptor)
            .build()

    @[NewsScope Provides VkQualifier]
    fun retrofit(
        @VkQualifier gsonConverterFactory: GsonConverterFactory,
        @VkQualifier okHttpClient: OkHttpClient
    ): Retrofit =
        Retrofit.Builder()
            .baseUrl(BuildConfig.VK_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(gsonConverterFactory)
            .build()

    @[NewsScope Provides]
    fun provideVkApi(@VkQualifier retrofit: Retrofit): VkApi = retrofit.create(VkApi::class.java)

    @[NewsScope Provides]
    fun provideVkNetworkRepository(
        api: VkApi,
        vkMapper: Mapper<VkNewsResponse, VkInfo>
    ): VkNetworkRepository =
        VkNetworkRepositoryImpl(api, vkMapper)
}