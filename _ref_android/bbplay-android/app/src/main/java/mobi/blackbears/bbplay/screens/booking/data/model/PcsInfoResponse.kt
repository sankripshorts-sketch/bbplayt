package mobi.blackbears.bbplay.screens.booking.data.model

import com.google.gson.annotations.SerializedName

data class PcsInfoResponse(
    @SerializedName("license_using_billing")
    val licenseUsingBilling: Long,

    @SerializedName("shift_status")
    val shiftStatus: Long,

    @SerializedName("pc_list")
    val pcList: List<PcResponse>
)