package mobi.blackbears.bbplay.screens.settings.data.network

import mobi.blackbears.bbplay.common.data.model.getDataOrThrowException
import mobi.blackbears.bbplay.screens.settings.data.mapper.SettingsMapper
import mobi.blackbears.bbplay.screens.settings.data.model.PasswordFieldsBody
import mobi.blackbears.bbplay.screens.settings.domain.model.SettingsInfo
import javax.inject.Inject

class SettingsRepositoryImpl @Inject constructor(
    private val api: SettingsApi,
    private val mapper: SettingsMapper
) : SettingsRepository {
    override suspend fun getUserInfo(userId: Long): SettingsInfo {
            val serverResponse = api.getUserInfo(memberId = userId).getDataOrThrowException()
            return mapper.transform(serverResponse.memberResponse)
    }

    override suspend fun changePassword(memberId: Long, newPassword: String) {
        api.changePassword(
            memberId = memberId,
            newPassword = PasswordFieldsBody(newPassword, newPassword)
        ).getDataOrThrowException()
    }
}