package mobi.blackbears.bbplay.common.data.network


import android.os.Build
import mobi.blackbears.bbplay.BuildConfig
import okhttp3.Interceptor
import okhttp3.Response
import timber.log.Timber

class RequestInterceptor : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        Timber.d("Add headers in request")
        val request = chain.request().newBuilder()
            .addHeader("Key", BuildConfig.KEY)
            .addHeader("User-Agent", String.format(
                "%s/v%s (%s; Android %s)",
                BuildConfig.CLIENT_HEADER,
                BuildConfig.VERSION_NAME,
                Build.MANUFACTURER + " " + Build.MODEL,
                Build.VERSION.RELEASE
            ))
            .build()

        return chain.proceed(request)
    }
}