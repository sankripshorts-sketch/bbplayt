package mobi.blackbears.bbplay.common.domain.usecases

import mobi.blackbears.bbplay.common.data.model.BBError
import mobi.blackbears.bbplay.common.data.network.CommonNetworkRepository
import mobi.blackbears.bbplay.common.domain.model.UserActive
import mobi.blackbears.bbplay.common.extensions.emptyString
import javax.inject.Inject

class CheckUserExistsOrActiveUseCaseImpl @Inject constructor(
    private val repository: CommonNetworkRepository
) : CheckUserExistsOrActiveUseCase {
    override suspend fun invoke(userId: Long): Long {
        val userActive = repository.getUserIsActive(userId)
        if (userActive.memberIsActive == UserActive.DISABLED_MEMBER)
            throw BBError(emptyString(), "Account not active")
        return userActive.memberId
    }
}