package mobi.blackbears.bbplay.screens.login.data.mapper

import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.screens.login.data.model.VerifyPhoneNumberBody
import mobi.blackbears.bbplay.screens.login.domain.model.VerificationPhoneData
import javax.inject.Inject

class VerifyPhoneNumberBodyMapper @Inject constructor() :
    Mapper<VerificationPhoneData, VerifyPhoneNumberBody> {

    override fun transform(data: VerificationPhoneData): VerifyPhoneNumberBody = data.run {
        VerifyPhoneNumberBody(
            memberId = userId.toString(),
            encodedData = encodedData,
            verificationCode = code,
            randomKey = randomKey,
            key = key,
        )
    }
}