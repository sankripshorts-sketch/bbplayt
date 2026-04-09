package mobi.blackbears.bbplay.screens.settings.domain.model

import mobi.blackbears.bbplay.common.extensions.emptyString

data class SettingsInfo(
    val memberId: Long,
    var memberAccount: String,
    var memberFirstName: String,
    var memberLastName: String,
    var memberPhone: String,
    var memberBirthday: String,
    var memberEmail: String,
) {
    companion object {
        var EMPTY = SettingsInfo(
            memberId = -1,
            memberAccount = "",
            memberFirstName = "",
            memberLastName = "",
            memberPhone = "",
            memberBirthday = "",
            memberEmail = emptyString()
        )
    }
}


