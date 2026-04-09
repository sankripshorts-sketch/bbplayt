package mobi.blackbears.bbplay.screens.booking.di

import dagger.Component
import mobi.blackbears.bbplay.common.application.AppComponent
import mobi.blackbears.bbplay.screens.booking.presentation.fragments.BookingFragment
import mobi.blackbears.bbplay.screens.booking.presentation.fragments.PriceInfoBottomFragment
import mobi.blackbears.bbplay.screens.booking.presentation.fragments.user_bookings.UserBookingsFragment

@BookingScope
@Component(
    modules = [
        BookingApiModule::class,
        BookingFeatureModule::class],
    dependencies = [AppComponent::class]
)

interface BookingComponent {

    fun inject(fragment: BookingFragment)

    fun inject(fragment: UserBookingsFragment)

    fun inject(fragment: PriceInfoBottomFragment)

    @Component.Factory
    interface Factory {
        fun create(appComponent: AppComponent): BookingComponent
    }
}