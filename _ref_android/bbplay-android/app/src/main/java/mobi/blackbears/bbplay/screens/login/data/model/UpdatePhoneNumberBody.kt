package mobi.blackbears.bbplay.screens.login.data.model

import com.google.gson.annotations.SerializedName

data class UpdatePhoneNumberBody(
    @SerializedName("member_id")
    val memberId: String,

    @SerializedName("new_phone")
    val newPhone: String,

    @SerializedName("old_phone")
    val oldPhone: String,
)