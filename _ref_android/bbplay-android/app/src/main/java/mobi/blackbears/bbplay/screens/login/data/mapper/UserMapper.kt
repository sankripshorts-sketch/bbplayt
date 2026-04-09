package mobi.blackbears.bbplay.screens.login.data.mapper

import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.common.data.model.MemberResponse
import mobi.blackbears.bbplay.common.extensions.emptyString
import mobi.blackbears.bbplay.screens.login.domain.model.User
import javax.inject.Inject

class UserMapper @Inject constructor() : Mapper<MemberResponse?, User> {
    override fun transform(data: MemberResponse?): User = data?.run {
        User(
            memberId = memberId,
            memberAccount = memberAccount,
            memberFirstName = memberFirstName,
            memberLastName = memberLastName,
            memberPhone = memberPhone,
            memberIsActive = memberIsActive,
            memberEmail = memberEmail
        )
    } ?: User(
        0L,
        emptyString(),
        emptyString(),
        emptyString(),
        emptyString(),
        0L,
        emptyString()
    )
}