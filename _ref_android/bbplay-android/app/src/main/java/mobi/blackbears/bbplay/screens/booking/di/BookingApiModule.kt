package mobi.blackbears.bbplay.screens.booking.di


import dagger.Module
import dagger.Provides
import mobi.blackbears.bbplay.screens.booking.data.network.BookingApi
import retrofit2.Retrofit

@Module
class BookingApiModule {

    @BookingScope
    @Provides
    fun provideApi(retrofit: Retrofit): BookingApi = retrofit.create(BookingApi::class.java)
}