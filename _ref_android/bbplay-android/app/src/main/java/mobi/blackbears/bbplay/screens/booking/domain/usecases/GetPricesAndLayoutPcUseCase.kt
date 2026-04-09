package mobi.blackbears.bbplay.screens.booking.domain.usecases

import kotlinx.coroutines.flow.Flow
import mobi.blackbears.bbplay.screens.booking.domain.model.AreaZone
import mobi.blackbears.bbplay.screens.booking.domain.model.ClubInfoWithPrices

interface GetPricesAndLayoutPcUseCase {
    fun getPricesAndClubInfo(): Flow<ClubInfoWithPrices>

    suspend fun getAreasWithPcs(): List<AreaZone>
}