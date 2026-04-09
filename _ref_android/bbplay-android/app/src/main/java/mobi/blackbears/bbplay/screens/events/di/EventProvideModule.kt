package mobi.blackbears.bbplay.screens.events.di

import dagger.*
import mobi.blackbears.bbplay.screens.events.data.network.EventApi
import mobi.blackbears.bbplay.screens.events.fragments.event.factory.CreateEventItemsFactory
import retrofit2.Retrofit

@Module
class EventProvideModule {

    @[EventScope Provides]
    fun api(retrofit: Retrofit): EventApi = retrofit.create(EventApi::class.java)

    @[EventScope Provides]
    fun provideEventItemsFactory(): CreateEventItemsFactory = CreateEventItemsFactory()
}