package mobi.blackbears.bbplay.common.activity.di

import dagger.Component
import mobi.blackbears.bbplay.common.application.AppComponent
import mobi.blackbears.bbplay.common.activity.MainActivity

@ActivityScope
@Component(
    modules = [ActivityModule::class],
    dependencies = [AppComponent::class]
)
interface ActivityComponent {
    fun inject(activity: MainActivity)

    @Component.Factory
    interface Factory {
        fun create(appComponent: AppComponent): ActivityComponent
    }
}