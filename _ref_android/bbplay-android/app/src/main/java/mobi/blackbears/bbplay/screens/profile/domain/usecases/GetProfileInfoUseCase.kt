package mobi.blackbears.bbplay.screens.profile.domain.usecases

import mobi.blackbears.bbplay.screens.profile.domain.model.ProfileInfo

interface GetProfileInfoUseCase {

    suspend operator fun invoke(userId: Long): ProfileInfo
}