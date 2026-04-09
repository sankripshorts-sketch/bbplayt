package mobi.blackbears.bbplay.screens.login.data.mapper

import android.annotation.SuppressLint
import mobi.blackbears.bbplay.common.extensions.*
import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.screens.login.data.model.RegistrationBody
import mobi.blackbears.bbplay.screens.login.domain.model.NewAccountFields
import java.time.format.DateTimeFormatter
import javax.inject.Inject

class RegistrationBodyMapper @Inject constructor(): Mapper<NewAccountFields, RegistrationBody> {

    @SuppressLint("SimpleDateFormat")
    override fun transform(data: NewAccountFields): RegistrationBody = data.run {
        RegistrationBody(
            memberAccount = memberAccount,
            memberFirstName = memberFirstName,
            memberSecondName = memberSecondName,
            memberPhone = "+" + memberPhone.removeAllNotDigitChars(),
            memberBirthday = memberBirthday.toLocalDate(DateTimeFormatter.ofPattern("dd.MM.yyyy")).toString(),
            memberPassword = memberPassword,
            memberConfirmPassword = memberPassword,
            memberEmail = memberEmail
        )
    }
}