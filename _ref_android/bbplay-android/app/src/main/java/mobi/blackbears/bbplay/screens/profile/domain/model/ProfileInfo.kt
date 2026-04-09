package mobi.blackbears.bbplay.screens.profile.domain.model

import mobi.blackbears.bbplay.common.extensions.emptyString

data class ProfileInfo(
    val memberId: Long,
    val memberAccount: String,
    val memberBalance: String,
    val memberBonusBalance: String,
    val memberCups: String,
    val memberPhone: String,
    val memberEmail: String,
    val memberIsFirstSbpPayment: Boolean,
) {
    companion object {
        val EMPTY = ProfileInfo(
            memberId = -1,
            memberAccount = "",
            memberBalance = "",
            memberBonusBalance = "",
            memberCups = "",
            memberPhone = "",
            memberIsFirstSbpPayment = false,
            memberEmail = emptyString()
        )
    }
}


