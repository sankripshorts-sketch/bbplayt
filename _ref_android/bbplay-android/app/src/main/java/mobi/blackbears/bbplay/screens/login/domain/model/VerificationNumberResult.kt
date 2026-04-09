package mobi.blackbears.bbplay.screens.login.domain.model

import java.lang.Exception

sealed class VerificationNumberResult {
    data class Success(val message: String) : VerificationNumberResult()
    data class WrongCode(val message: String) : VerificationNumberResult()
    data class VerificationLimitReached(val message: String) : VerificationNumberResult()
    data class UndefinedError(val exception: Exception) : VerificationNumberResult()
}