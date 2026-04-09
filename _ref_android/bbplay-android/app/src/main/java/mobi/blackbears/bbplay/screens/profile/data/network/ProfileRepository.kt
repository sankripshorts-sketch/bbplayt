package mobi.blackbears.bbplay.screens.profile.data.network

import mobi.blackbears.bbplay.screens.profile.domain.model.ProfileInfo

interface ProfileRepository {
    suspend fun getUserInfo(userId: Long): ProfileInfo
}