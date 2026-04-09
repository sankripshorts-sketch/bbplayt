package mobi.blackbears.bbplay.common.application


import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.google.gson.JsonDeserializer
import dagger.*
import mobi.blackbears.bbplay.BuildConfig
import mobi.blackbears.bbplay.common.data.model.GameResponse
import mobi.blackbears.bbplay.common.data.network.CommonNetworkApi
import mobi.blackbears.bbplay.common.data.network.CommonNetworkRepository
import mobi.blackbears.bbplay.common.data.network.CommonNetworkRepositoryImpl
import mobi.blackbears.bbplay.common.data.network.RequestInterceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Converter
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import timber.log.Timber
import javax.inject.Singleton

@Module
class NetworkModule {

    @Singleton
    @Provides
    fun gsonConverterFactory(): GsonConverterFactory = GsonConverterFactory.create()

    @Singleton
    @Provides
    fun provideHttpLoggingInterceptor(): HttpLoggingInterceptor =
        HttpLoggingInterceptor() { message: String? -> Timber.i("LOG_BODY $message") }
            .setLevel(HttpLoggingInterceptor.Level.BODY)

    @Singleton
    @Provides
    fun provideRequestInterceptor() = RequestInterceptor()

    @Singleton
    @Provides
    fun provideOkHttpClient(
        requestInterceptor: RequestInterceptor,
        httpLogInterceptor: HttpLoggingInterceptor
    ): OkHttpClient =
        OkHttpClient.Builder()
            .addInterceptor(requestInterceptor)
            .addInterceptor(httpLogInterceptor)
            .build()

    @Singleton
    @Provides
    fun retrofit(
        gsonConverterFactory: GsonConverterFactory,
        okHttpClient: OkHttpClient,
        gameConverterFactory: Converter.Factory
    ): Retrofit =
        Retrofit.Builder()
            .baseUrl(BuildConfig.BBPLAY_URL)
            .client(okHttpClient)
            .addConverterFactory(gsonConverterFactory)
            .addConverterFactory(gameConverterFactory)
            .build()

    @Singleton
    @Provides
    fun provideGameConverterFactory(): Converter.Factory {
        val gson = Gson()
        val deserializer = JsonDeserializer { json, typeOfT, _ ->
            gson.fromJson<GameResponse<*>>(json, typeOfT)
        }

        return GsonConverterFactory.create(
            GsonBuilder().apply {
                registerTypeAdapter(GameResponse::class.java, deserializer)
            }.create()
        )
    }

    @Provides
    fun provideCommonNetworkRepository(api: CommonNetworkApi): CommonNetworkRepository =
        CommonNetworkRepositoryImpl(api)
}