package mobi.blackbears.bbplay.screens.payment.data.mapper

import mobi.blackbears.bbplay.common.extensions.emptyString
import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.screens.payment.data.model.PayResponse
import mobi.blackbears.bbplay.screens.payment.domain.model.PayInfo
import javax.inject.Inject

class PayMapper @Inject constructor(): Mapper<PayResponse, PayInfo> {
    override fun transform(data: PayResponse): PayInfo = data.run {
        PayInfo(
            id = id,
            status = status,
            paid = paid,
            value = amount.value,
            currency = amount.currency,
            confirmationType = confirmation?.type ?: emptyString(),
            confirmationURL = confirmation?.confirmationURL ?: emptyString(),
            description = description ?: emptyString(),
            accountID = recipient.accountID,
            gatewayID = recipient.gatewayID,
            refundable = refundable,
            test = test,
            createdAt = createdAt,
            paymentType = paymentMethod.type,
            paymentId = paymentMethod.id,
            paymentSaved = paymentMethod.saved
        )
    }
}