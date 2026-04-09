package mobi.blackbears.bbplay.common.extensions

import android.content.Context
import android.content.res.Configuration
import android.os.LocaleList
import mobi.blackbears.bbplay.R
import java.util.Locale

private const val DEFAULT_LANG = "ru"
private const val DEFAULT_COUNTRY = "RU"

private fun Context.getDefaultQuantityString(resId: Int, quantity: Int, vararg formatArgs: Any): String {
    val defaultLocale = Locale(DEFAULT_LANG, DEFAULT_COUNTRY)
    val config = Configuration(resources.configuration)
    config.setLocales(LocaleList(defaultLocale))

    val defaultContext = createConfigurationContext(config)

    return defaultContext.resources.getQuantityString(resId, quantity, *formatArgs)
}

fun Context.getQuantityStringOrDefault(resId: Int, quantity: Int, vararg formatArgs: Any): String {
    return try {
        resources.getQuantityString(R.plurals.hours_plurals, quantity, *formatArgs)
    } catch (_: Exception) {
        getDefaultQuantityString(resId, quantity, *formatArgs)
    }
}
