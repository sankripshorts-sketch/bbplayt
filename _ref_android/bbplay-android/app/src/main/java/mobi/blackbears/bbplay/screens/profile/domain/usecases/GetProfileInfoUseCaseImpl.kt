package mobi.blackbears.bbplay.screens.profile.domain.usecases


import mobi.blackbears.bbplay.screens.profile.data.network.ProfileRepository
import mobi.blackbears.bbplay.screens.profile.domain.model.ProfileInfo
import javax.inject.Inject

class GetProfileInfoUseCaseImpl @Inject constructor(private val repository: ProfileRepository) :
    GetProfileInfoUseCase {
    override suspend fun invoke(userId: Long): ProfileInfo {
        return repository.getUserInfo(userId)
    }
}