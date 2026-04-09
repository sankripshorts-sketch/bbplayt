package mobi.blackbears.bbplay.screens.login.domain.model

data class VerificationPhoneData(
    val userId: Long,
    val code: String,
    val encodedData: String,
    val randomKey: String,
    val key: String,
)
