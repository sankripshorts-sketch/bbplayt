package mobi.blackbears.bbplay.screens.news.data.network

import mobi.blackbears.bbplay.BuildConfig
import okhttp3.Interceptor
import okhttp3.Response
import timber.log.Timber

class RequestVkInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        Timber.d("Add headers in request for vk api")
        val request = chain.request().newBuilder()
            .addHeader("Authorization", BuildConfig.VK_AUTHORIZATION)
            .build()

        return chain.proceed(request)
    }
}