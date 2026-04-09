package mobi.blackbears.bbplay.screens.login.domain.model

import java.lang.Exception

sealed class RequestCodeResult {
    data class Success(val message: String, val data: RequestCodePayload) : RequestCodeResult()
    data class MemberNotFound(val message: String) : RequestCodeResult()
    data class PhoneVerified(val message: String) : RequestCodeResult()
    data class TooManyRequests(val message: String) : RequestCodeResult()
    data class UndefinedError(val exception: Exception) : RequestCodeResult()
}