package mobi.blackbears.bbplay.screens.news.data.network

import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.screens.news.data.model.VkNewsResponse
import mobi.blackbears.bbplay.screens.news.domain.model.VkInfo

class VkNetworkRepositoryImpl(
    private val api: VkApi,
    private val vkMapper: Mapper<VkNewsResponse, VkInfo>
): VkNetworkRepository {
    override suspend fun getVkNewsInWall(): VkInfo {
        val result = api.getWallPosts()
        return vkMapper.transform(result)
    }
}