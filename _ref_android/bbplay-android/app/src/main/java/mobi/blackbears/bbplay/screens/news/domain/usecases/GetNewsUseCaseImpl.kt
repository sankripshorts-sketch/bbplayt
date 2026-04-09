package mobi.blackbears.bbplay.screens.news.domain.usecases

import mobi.blackbears.bbplay.screens.news.data.network.VkNetworkRepository
import mobi.blackbears.bbplay.screens.news.domain.model.VkInfo
import javax.inject.Inject

class GetNewsUseCaseImpl @Inject constructor(
    private val networkRepository: VkNetworkRepository
) : GetNewsUseCase {
    override suspend fun getNews(): VkInfo = networkRepository.getVkNewsInWall()
}