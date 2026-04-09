package mobi.blackbears.bbplay.screens.settings.data.network

import mobi.blackbears.bbplay.screens.settings.domain.model.SettingsInfo


interface SettingsRepository {

    suspend fun getUserInfo(userId: Long): SettingsInfo

    suspend fun changePassword(memberId: Long, newPassword: String)
}