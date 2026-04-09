package mobi.blackbears.bbplay.screens.login.domain.model

data class User(
    val memberId: Long,
    val memberAccount: String,
    val memberFirstName: String,
    val memberLastName: String,
    val memberPhone: String,
    val memberIsActive: Long,
    val memberEmail: String,
)