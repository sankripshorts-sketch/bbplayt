package mobi.blackbears.bbplay.screens.login.data.model

import com.google.gson.annotations.SerializedName

data class VerifyPhoneNumberBody(
    @SerializedName("member_id")
    val memberId: String,

    @SerializedName("encoded_data")
    val encodedData: String,

    @SerializedName("code")
    val verificationCode: String,

    @SerializedName("rand_key")
    val randomKey: String,

    @SerializedName("key")
    val key: String,
)