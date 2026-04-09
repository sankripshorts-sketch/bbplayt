package mobi.blackbears.bbplay.common.preferences

import kotlinx.coroutines.flow.Flow

interface PreferenceManager {
    /**
     * Сохранить данные пользователя. Нужно для понимания вошел пользователь или нет.
     * @param userId id зарегистрированного пользователя.
     * @param uid Уникальный id. Определяет, что именно этот пользователь на конкретном девайсе
     * пользуется приложением.
     * @param nickname Никнейм пользователя.
     * @param privateKey Ключ с бэкенда, дается при регистрации или логине пользователя
     */
    suspend fun setUserData(userData: UserData)
    fun getUserData(): Flow<UserData>

    fun setCachedUserData(userData: UserData)
    fun getCachedUserData(): UserData
}