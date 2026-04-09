package mobi.blackbears.bbplay.screens.login.domain.usecases

interface UpdatePhoneNumberUseCase {
    suspend operator fun invoke(
        userId: Long,
        newPhone: String,
        oldPhone: String,
    ) : Boolean
}