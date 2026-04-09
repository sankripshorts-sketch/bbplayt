package mobi.blackbears.bbplay.screens.settings.domain.usecases

interface ChangePasswordUseCase {
    suspend operator fun invoke(
        memberId: Long,
        accountLogin: String,
        oldPassword: String,
        newPassword: String
    )
}