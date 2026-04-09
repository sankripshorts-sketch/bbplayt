package mobi.blackbears.bbplay.screens.events.di

import dagger.Component
import mobi.blackbears.bbplay.common.application.AppComponent
import mobi.blackbears.bbplay.screens.events.fragments.detail_event.DetailEventFragment
import mobi.blackbears.bbplay.screens.events.fragments.event.EventFragment

@EventScope
@Component(
    modules = [EventBindsModule::class, EventProvideModule::class],
    dependencies = [AppComponent::class]
)
interface EventComponent {

    fun inject(fragment: EventFragment)

    fun inject(fragment: DetailEventFragment)

    @Component.Factory
    interface Factory {
        fun create(appComponent: AppComponent): EventComponent
    }
}