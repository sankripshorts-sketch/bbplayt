package mobi.blackbears.bbplay.screens.settings.di

import mobi.blackbears.bbplay.common.application.AppComponent
import mobi.blackbears.bbplay.screens.login.di.LoginComponent
import mobi.blackbears.bbplay.screens.settings.SettingsFragment
import dagger.Component

@SettingsScope
@Component(
    modules = [
        SettingsFeatureModule::class,
        SettingsApiModule::class
    ],
    dependencies = [AppComponent::class, LoginComponent::class]
)

interface SettingsComponent {
    fun inject(fragment: SettingsFragment)

    @Component.Factory
    interface Factory {
        fun create(appComponent: AppComponent, loginComponent: LoginComponent): SettingsComponent
    }
}