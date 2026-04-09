package mobi.blackbears.bbplay.screens.news.domain.usecases

import mobi.blackbears.bbplay.screens.news.domain.model.VkInfo

interface GetNewsUseCase {
    suspend fun getNews(): VkInfo
}