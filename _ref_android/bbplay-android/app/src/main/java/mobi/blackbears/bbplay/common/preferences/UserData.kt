package mobi.blackbears.bbplay.common.preferences

// todo: нужно учесть, что на экране настроек номер получается напрямую с сервера, нужно избежать неконсистентность
/**
 * @param userId id зарегистрированного пользователя.
 * @param uid Уникальный id. Определяет, что именно этот пользователь на конкретном девайсе
 * пользуется приложением.
 * @param nickname Никнейм пользователя.
 */
data class UserData(
    val userId: Long,
    val uid: String,
    val email: String,
    val nickname: String,
    val phone: String,
    val userPrivateKey: String
) {
    companion object {
        const val NONE_ID = -1L
        const val NONE_UID = ""
        const val NONE_NICK = ""
        const val NONE_PHONE = ""
        const val NONE_EMAIL = ""
        const val NONE_PRIVATE_KEY = ""
        val NONE = UserData(NONE_ID, NONE_UID, NONE_NICK, NONE_PHONE, NONE_PRIVATE_KEY, NONE_EMAIL)
    }
}