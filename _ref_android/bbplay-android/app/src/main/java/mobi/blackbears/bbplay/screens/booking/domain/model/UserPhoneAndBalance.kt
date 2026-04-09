package mobi.blackbears.bbplay.screens.booking.domain.model

import mobi.blackbears.bbplay.common.extensions.emptyString

data class UserPhoneAndBalance(
    val memberBalance: Double,
    val memberPhone: String
) {
    companion object {
        val NONE = UserPhoneAndBalance(0.0, emptyString())
    }
}