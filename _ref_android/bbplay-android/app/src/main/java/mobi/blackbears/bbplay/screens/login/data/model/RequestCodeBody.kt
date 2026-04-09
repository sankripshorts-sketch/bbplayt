package mobi.blackbears.bbplay.screens.login.data.model

import com.google.gson.annotations.SerializedName

data class RequestCodeBody(
    @SerializedName("member_id")
    val memberId: String,

    @SerializedName("member_phone")
    val memberPhone: String,
)