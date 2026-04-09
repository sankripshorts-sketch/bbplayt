package mobi.blackbears.bbplay.common.data.network

import mobi.blackbears.bbplay.common.domain.model.UserActive

interface CommonNetworkRepository {
    /**
     * @return UserActive
     * @throws BBError если пользователя с данным userId уже не существует
     * @see UserActive
     */
    suspend fun getUserIsActive(userId: Long): UserActive
}