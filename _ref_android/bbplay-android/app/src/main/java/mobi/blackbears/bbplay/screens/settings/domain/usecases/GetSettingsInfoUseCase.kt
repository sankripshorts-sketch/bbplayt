package mobi.blackbears.bbplay.screens.settings.domain.usecases

import mobi.blackbears.bbplay.screens.settings.domain.model.SettingsInfo

interface GetSettingsInfoUseCase {

    suspend operator fun invoke(userId: Long): SettingsInfo
}