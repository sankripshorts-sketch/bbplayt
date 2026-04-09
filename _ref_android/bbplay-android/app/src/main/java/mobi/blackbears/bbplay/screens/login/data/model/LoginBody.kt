package mobi.blackbears.bbplay.screens.login.data.model

import com.google.gson.annotations.SerializedName

data class LoginBody(
    @SerializedName("member_name")
    val memberName: String,

    @SerializedName("password")
    val password: String
)