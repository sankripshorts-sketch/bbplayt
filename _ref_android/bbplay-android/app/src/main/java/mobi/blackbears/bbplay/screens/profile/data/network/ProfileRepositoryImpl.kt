package mobi.blackbears.bbplay.screens.profile.data.network

import mobi.blackbears.bbplay.common.data.model.MemberResponse
import mobi.blackbears.bbplay.common.data.model.getDataOrThrowException
import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.screens.profile.domain.model.*
import javax.inject.Inject

class ProfileRepositoryImpl @Inject constructor(
    private val api: ProfileApi,
    private val profileMapper: Mapper<MemberResponse, ProfileInfo>
) : ProfileRepository {
    override suspend fun getUserInfo(userId: Long): ProfileInfo {
        val serverResponse = api.getUserInfo(memberId = userId).getDataOrThrowException()
        return profileMapper.transform(serverResponse.memberResponse)
    }
}