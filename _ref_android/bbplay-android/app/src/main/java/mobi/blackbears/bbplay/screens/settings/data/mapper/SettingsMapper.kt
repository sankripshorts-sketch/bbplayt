package mobi.blackbears.bbplay.screens.settings.data.mapper

import android.annotation.SuppressLint
import mobi.blackbears.bbplay.common.data.model.MemberResponse
import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.screens.settings.domain.model.SettingsInfo
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

class SettingsMapper @Inject constructor() : Mapper<MemberResponse, SettingsInfo> {

    @SuppressLint("SimpleDateFormat")
    override fun transform(data: MemberResponse): SettingsInfo {
        val formatApi = SimpleDateFormat("yyyy-MM-dd")
        val formatMy = SimpleDateFormat("dd.MM.yyyy")
        val c: Calendar = Calendar.getInstance()
        c.time = formatApi.parse(data.memberBirthday) as Date
        val date = formatMy.format(c.time)
        return SettingsInfo(
            memberId = data.memberId,
            memberAccount = data.memberAccount,
            memberFirstName = data.memberFirstName,
            memberLastName = data.memberLastName,
            memberPhone = data.memberPhone,
            memberBirthday = date.toString(),
            memberEmail = data.memberEmail
        )
    }


}