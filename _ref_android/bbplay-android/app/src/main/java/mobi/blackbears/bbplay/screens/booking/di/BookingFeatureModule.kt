package mobi.blackbears.bbplay.screens.booking.di

import androidx.lifecycle.ViewModel
import androidx.recyclerview.widget.RecyclerView
import dagger.Binds
import dagger.Module
import dagger.multibindings.IntoMap
import mobi.blackbears.bbplay.common.fragment.adapter.GeneralListAdapter
import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.common.viewmodelfactory.ViewModelKey
import mobi.blackbears.bbplay.screens.booking.presentation.fragments.BookingViewModel
import mobi.blackbears.bbplay.screens.booking.presentation.adapter.PriceInfoAdapter
import mobi.blackbears.bbplay.screens.booking.presentation.adapter.PriceItem
import mobi.blackbears.bbplay.screens.booking.data.mapper.AreaWithPcsMapper
import mobi.blackbears.bbplay.screens.booking.data.mapper.BookingMapper
import mobi.blackbears.bbplay.screens.booking.data.mapper.ClubsMapper
import mobi.blackbears.bbplay.screens.booking.data.mapper.PriceMapper
import mobi.blackbears.bbplay.screens.booking.data.mapper.SpecialShopMapper
import mobi.blackbears.bbplay.screens.booking.data.model.AreaModel
import mobi.blackbears.bbplay.screens.booking.data.model.Info
import mobi.blackbears.bbplay.screens.booking.data.model.PriceResponse
import mobi.blackbears.bbplay.screens.booking.data.model.ProductResponse
import mobi.blackbears.bbplay.screens.booking.data.model.booking.BookingResponse
import mobi.blackbears.bbplay.screens.booking.domain.BookingRepository
import mobi.blackbears.bbplay.screens.booking.data.network.BookingRepositoryImpl
import mobi.blackbears.bbplay.screens.booking.domain.model.AreaZone
import mobi.blackbears.bbplay.screens.booking.domain.model.ClubInfo
import mobi.blackbears.bbplay.screens.booking.domain.model.PricePerHour
import mobi.blackbears.bbplay.screens.booking.domain.model.SpecialProductPrice
import mobi.blackbears.bbplay.screens.booking.domain.model.booking.BookingInfo
import mobi.blackbears.bbplay.screens.booking.domain.usecases.BookingUseCase
import mobi.blackbears.bbplay.screens.booking.domain.usecases.BookingUseCaseImpl
import mobi.blackbears.bbplay.screens.booking.domain.usecases.CreatePriceZoneUseCase
import mobi.blackbears.bbplay.screens.booking.domain.usecases.CreatePriceZoneUseCaseImpl
import mobi.blackbears.bbplay.screens.booking.domain.usecases.GetPricesAndLayoutPcUseCase
import mobi.blackbears.bbplay.screens.booking.domain.usecases.GetPricesAndLayoutPcUseCaseImpl
import mobi.blackbears.bbplay.screens.booking.domain.usecases.GetUserPhoneAndBalanceUseCase
import mobi.blackbears.bbplay.screens.booking.domain.usecases.GetUserPhoneAndBalanceUseCaseImpl
import mobi.blackbears.bbplay.screens.booking.domain.usecases.PricePickerUseCase
import mobi.blackbears.bbplay.screens.booking.domain.usecases.PricePickerUseCaseImpl
import mobi.blackbears.bbplay.screens.booking.navigation.BookingRouter
import mobi.blackbears.bbplay.screens.booking.navigation.BookingRouterImpl
import mobi.blackbears.bbplay.screens.booking.presentation.fragments.user_bookings.UserBookingsViewModel

@Module
interface BookingFeatureModule {

    // region router
    @[BookingScope Binds]
    fun bindBookingRouter(router: BookingRouterImpl): BookingRouter
    //endregion

    // region view model
    @[BookingScope Binds IntoMap ViewModelKey(BookingViewModel::class)]
    fun bindBookingViewModel(viewModel: BookingViewModel): ViewModel

    @[BookingScope Binds IntoMap ViewModelKey(UserBookingsViewModel::class)]
    fun bindUserBookingsViewModel(viewModel: UserBookingsViewModel): ViewModel
    //endregion

    //region network
    @[BookingScope Binds]
    fun bindBookingRepository(repositoryImpl: BookingRepositoryImpl): BookingRepository

    @[BookingScope Binds]
    fun bindSpecialShopMapperMapper(mapper: SpecialShopMapper): Mapper<ProductResponse, SpecialProductPrice>

    @[BookingScope Binds]
    fun bindClubsMapper(mapper: ClubsMapper): Mapper<Info, ClubInfo>

    @[BookingScope Binds]
    fun bindPriceMapper(mapper: PriceMapper): Mapper<PriceResponse, PricePerHour>

    @[BookingScope Binds]
    fun bindAreaPcsMapper(mapper: AreaWithPcsMapper): Mapper<AreaModel, AreaZone>

    @[BookingScope Binds]
    fun bindBookingMapper(mapper: BookingMapper): Mapper<BookingResponse, BookingInfo>
    // endregion

    //region use case
    @[BookingScope Binds]
    fun bindGetPricesAndLayoutPcUseCase(useCase: GetPricesAndLayoutPcUseCaseImpl): GetPricesAndLayoutPcUseCase

    @[BookingScope Binds]
    fun bindCreatePriceZoneUseCase(useCase: CreatePriceZoneUseCaseImpl): CreatePriceZoneUseCase

    @[BookingScope Binds]
    fun bindBookingUseCase(useCase: BookingUseCaseImpl): BookingUseCase

    @[BookingScope Binds]
    fun bindPricePickerUseCase(useCase: PricePickerUseCaseImpl): PricePickerUseCase

    @[BookingScope Binds]
    fun bindGetUserPhoneUseCase(useCase: GetUserPhoneAndBalanceUseCaseImpl): GetUserPhoneAndBalanceUseCase
    // endregion

    //region adapter
    @[BookingScope Binds]
    fun bindPriceInfoAdapter(adapter: PriceInfoAdapter): GeneralListAdapter<PriceItem, RecyclerView.ViewHolder>
    // endregion
}