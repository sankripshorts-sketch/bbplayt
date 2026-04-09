package mobi.blackbears.bbplay.screens.profile.di

import mobi.blackbears.bbplay.common.application.AppComponent
import mobi.blackbears.bbplay.screens.profile.fragments.*
import dagger.Component

@ProfileScope
@Component(
    modules = [
        ProfileApiModule::class,
        ProfileFeatureModule::class],
    dependencies = [AppComponent::class]
)
interface ProfileComponent {
    fun inject(fragment: ProfileFragment)

    fun inject(fragment: BonusDialogFragment)

    fun inject(fragment: ConfirmUserEmailFragment)

    @Component.Factory
    interface Factory {
        fun create(appComponent: AppComponent): ProfileComponent
    }
}