package mobi.blackbears.bbplay.common.application

import android.app.Application
import android.content.Context
import dagger.*
import mobi.blackbears.bbplay.common.data.network.CommonNetworkRepository
import mobi.blackbears.bbplay.common.metrica.MetricManager
import mobi.blackbears.bbplay.common.preferences.PreferenceManager
import mobi.blackbears.bbplay.common.viewmodelfactory.ViewModelModuleFactory
import retrofit2.Retrofit
import javax.inject.Singleton

@Singleton
@Component(modules = [
    ViewModelModuleFactory::class,
    NetworkModule::class,
    AppModule::class]
)
interface AppComponent {

    fun inject(app: MainApp)

    fun getContext(): Context

    fun getRetrofit(): Retrofit

    fun getPreferencesManager(): PreferenceManager

    fun getCommonNetworkRepository(): CommonNetworkRepository

    fun getMetricManager(): MetricManager

    @Component.Builder
    interface Builder {
        @BindsInstance
        fun application(application: Application): Builder

        fun build(): AppComponent
    }
}