package mobi.blackbears.bbplay.screens.clubs.data.network

import mobi.blackbears.bbplay.screens.clubs.domain.model.ClubInfo


interface ClubsRepository {
    suspend fun getClubInfo(clubId: String): ClubInfo
}