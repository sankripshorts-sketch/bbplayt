package mobi.blackbears.bbplay.screens.booking.data.model.booking.body

import com.google.gson.annotations.SerializedName

/**
 * Body для оформления бронирования.
 * @param pcName имя компьютера обычно идет в формате pc14
 * @param memberId id пользователя в системе
 */
data class ClientStatusBody(
    @SerializedName("pc_name")
    val pcName: String,

    @SerializedName("member_id")
    val memberId: String?,
)