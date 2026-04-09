package mobi.blackbears.bbplay.screens.events.data.model

import com.google.gson.annotations.SerializedName

/**
 * Body для забора награды.
 * @param memberId id пользователя в системе
 * @param eventId id события, за которое мы хотим получить награду
 * @param randomKey Рандомная строка из 8 символов
 * @param key ключ хэшированный в md5(id игрока, rand_key, privateKey, secretKey). Рандомную строку
 * генерируем сами, при каждом обращении к запросу. Приватный ключ дает нам бэкенд при регистрации
 * и логине.
 */
data class GetRewardBody(
    @SerializedName("client_id")
    val memberId: String,

    @SerializedName("event_id")
    val eventId: String,

    @SerializedName("rand_key")
    val randomKey: String,

    @SerializedName("key")
    val key: String,

    @SerializedName("reward_amount")
    val rewardAmount: Int
)