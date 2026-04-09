package mobi.blackbears.bbplay.screens.clubs.data.network

import mobi.blackbears.bbplay.common.data.model.getDataOrThrowException
import mobi.blackbears.bbplay.screens.clubs.data.mapper.ClubsMapper
import mobi.blackbears.bbplay.screens.clubs.domain.model.ClubInfo
import javax.inject.Inject

class ClubsRepositoryImpl @Inject constructor(
    private val api: ClubsApi,
    private val mapper: ClubsMapper
) : ClubsRepository {

    override suspend fun getClubInfo(clubId: String): ClubInfo {
        val serverResponse = api.getUserInfo(clubId).getDataOrThrowException()
        return mapper.transform(serverResponse.info)
    }
}