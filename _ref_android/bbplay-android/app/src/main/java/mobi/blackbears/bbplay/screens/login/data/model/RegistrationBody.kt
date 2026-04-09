package mobi.blackbears.bbplay.screens.login.data.model

import com.google.gson.annotations.SerializedName

data class RegistrationBody(
    @SerializedName("member_account")
    val memberAccount: String,

    @SerializedName("member_first_name")
    val memberFirstName: String,

    @SerializedName("member_last_name")
    val memberSecondName: String,

    @SerializedName("member_email")
    val memberEmail: String,

    @SerializedName("member_birthday")
    val memberBirthday: String,

    @SerializedName("member_phone")
    val memberPhone: String,

    @SerializedName("member_password")
    val memberPassword: String,

    @SerializedName("member_confirm")
    val memberConfirmPassword: String
)