package mobi.blackbears.bbplay.screens.profile.data.mapper

import android.annotation.SuppressLint
import mobi.blackbears.bbplay.common.data.model.MemberResponse
import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.screens.profile.domain.model.ProfileInfo
import javax.inject.Inject

class ProfileMapper @Inject constructor() : Mapper<MemberResponse, ProfileInfo> {

    @SuppressLint("SimpleDateFormat")
    override fun transform(data: MemberResponse) = ProfileInfo(
        memberId = data.memberId,
        memberAccount = data.memberAccount,
        memberBalance = data.memberBalance.replace(".00", ""),
        memberBonusBalance = data.memberBalanceBonus.replace(".00", ""),
        memberCups = data.memberCoinBalance.replace(".00", ""),
        memberPhone = data.memberPhone,
        memberIsFirstSbpPayment = data.isFirstPayment,
        memberEmail = data.memberEmail
    )
}