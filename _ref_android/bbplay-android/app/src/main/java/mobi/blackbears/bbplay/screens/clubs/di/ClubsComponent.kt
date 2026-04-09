package mobi.blackbears.bbplay.screens.clubs.di

import mobi.blackbears.bbplay.common.application.AppComponent
import mobi.blackbears.bbplay.screens.clubs.presentation.ClubsFragment
import mobi.blackbears.bbplay.screens.clubs.presentation.JobReviewDialogFragment
import dagger.Component

@ClubsScope
@Component(
    modules = [
        ClubsFeatureModule::class,
        ClubsApiModule::class
              ],
    dependencies = [AppComponent::class]
)

interface ClubsComponent {
    fun inject(fragment: ClubsFragment)

    fun inject(fragment: JobReviewDialogFragment)

    @Component.Factory
    interface Factory {
        fun create(appComponent: AppComponent): ClubsComponent
    }
}