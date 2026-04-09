package mobi.blackbears.bbplay.screens.settings.data.model

import com.google.gson.annotations.SerializedName

/**
 * @param memberIsActive при изменении пароля, бэк меняет состояиние пользователя на 0(false),
 * поэтому нужно сохранить его активность передавая параметр в запрос.
 * Не трогать и не менять без необходимости.
 */
data class PasswordFieldsBody(
    @SerializedName("member_password")
    val memberPassword: String,

    @SerializedName("member_confirm")
    val confirmPassword: String,

    @SerializedName("member_is_active")
    val memberIsActive: Long = 1
)