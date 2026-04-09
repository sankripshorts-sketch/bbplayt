package mobi.blackbears.bbplay.screens.leaderboard.di

import mobi.blackbears.bbplay.common.application.AppComponent
import mobi.blackbears.bbplay.screens.leaderboard.fragments.leaders.LeadersFragment
import mobi.blackbears.bbplay.screens.leaderboard.fragments.leaders.StatisticDialogFragment
import mobi.blackbears.bbplay.screens.leaderboard.fragments.tournament.TournamentsFragment
import dagger.Component

@LeaderBoardScope
@Component(
    modules = [
        LeaderBoardProvideModule::class,
        LeaderBoardFeatureModule::class
    ],
    dependencies = [AppComponent::class]
)
interface LeaderBoardComponent {
    fun inject(fragment: TournamentsFragment)

    fun inject(fragment: LeadersFragment)

    fun inject(fragment: StatisticDialogFragment)

    @Component.Factory
    interface Factory {
        fun create(appComponent: AppComponent): LeaderBoardComponent
    }
}