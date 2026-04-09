package mobi.blackbears.bbplay.screens.settings.domain.usecases


import mobi.blackbears.bbplay.screens.settings.data.network.SettingsRepository
import mobi.blackbears.bbplay.screens.settings.domain.model.SettingsInfo
import javax.inject.Inject

class GetSettingsInfoUseCaseImpl @Inject constructor(private val repository: SettingsRepository):
    GetSettingsInfoUseCase {
    override suspend fun invoke(userId: Long): SettingsInfo {
        return repository.getUserInfo(userId)
    }
}