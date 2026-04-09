package mobi.blackbears.bbplay.screens.login.domain.model

data class LoginResult(
    val privateKey: String,
    val user: User,
    val isUserPhoneVerified: Boolean,
)