package mobi.blackbears.bbplay.screens.clubs.domain.usecases

import mobi.blackbears.bbplay.screens.clubs.domain.model.ClubInfo


interface GetClubInfoUseCase {
    suspend fun getClubsInfo(): List<ClubInfo>
}