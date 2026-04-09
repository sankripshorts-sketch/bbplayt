package mobi.blackbears.bbplay.screens.booking.data.model.booking.body

import com.google.gson.annotations.SerializedName

/**
 * Body для оформления бронирования.
 * @param pcName имя компьютера обычно идет в формате pc14
 * @param memberAccount никнейм пользователя
 * @param memberId id пользователя в системе
 * @param startDate дата бронирования
 * @param startTime время начала сеанса
 * @param minutes количество времени в минутах
 * @param priceId id покупаемого продукта. Если продукта нет значит это почасовая бронь
 * @param randomKey Рандомная строка из 8 символов
 * @param key ключ хэшированный в md5(id игрока, rand_key, privateKey, secretKey)
 */
data class BookingBody(
    @SerializedName("pc_name")
    val pcName: String,

    @SerializedName("member_account")
    val memberAccount: String,

    @SerializedName("member_id")
    val memberId: String,

    @SerializedName("start_date")
    val startDate: String,

    @SerializedName("start_time")
    val startTime: String,

    @SerializedName("mins")
    val minutes: String,

    @SerializedName("price_id")
    val priceId: Long?,

    @SerializedName("rand_key")
    val randomKey: String,

    @SerializedName("key")
    val key: String
)