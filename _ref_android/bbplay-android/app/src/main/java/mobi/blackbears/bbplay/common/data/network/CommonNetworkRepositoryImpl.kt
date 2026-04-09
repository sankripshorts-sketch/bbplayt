package mobi.blackbears.bbplay.common.data.network

import mobi.blackbears.bbplay.common.data.model.MemberResponse
import mobi.blackbears.bbplay.common.data.model.getDataOrThrowException
import mobi.blackbears.bbplay.common.domain.model.UserActive

class CommonNetworkRepositoryImpl(private val api: CommonNetworkApi): CommonNetworkRepository {
    override suspend fun getUserIsActive(userId: Long): UserActive {
        val result = api.getUserInfo(memberId = userId).getDataOrThrowException()
        return toUserActive(result.memberResponse)
    }

    private fun toUserActive(memberResponse: MemberResponse): UserActive =
        memberResponse.run { UserActive(memberId, memberIsActive) }
}