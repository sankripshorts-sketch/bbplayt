package mobi.blackbears.bbplay.screens.settings.domain.usecases

import mobi.blackbears.bbplay.screens.settings.data.network.SettingsRepository
import mobi.blackbears.bbplay.screens.login.domain.usecases.RegistrationUseCase
import javax.inject.Inject

class ChangePasswordUseCaseImpl @Inject constructor(
    private val settingsRepo: SettingsRepository,
    private val registrationUseCase: RegistrationUseCase
): ChangePasswordUseCase {
    override suspend fun invoke(
        memberId: Long,
        accountLogin: String,
        oldPassword: String,
        newPassword: String
    ) {
        registrationUseCase.tryLogin(accountLogin, oldPassword)
        settingsRepo.changePassword(memberId, newPassword)
    }
}