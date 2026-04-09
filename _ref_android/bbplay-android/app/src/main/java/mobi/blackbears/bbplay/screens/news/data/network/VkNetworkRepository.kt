package mobi.blackbears.bbplay.screens.news.data.network

import mobi.blackbears.bbplay.screens.news.domain.model.VkInfo

interface VkNetworkRepository {
    suspend fun getVkNewsInWall(): VkInfo
}