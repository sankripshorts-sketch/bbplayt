package mobi.blackbears.bbplay.screens.news.domain.usecases

import mobi.blackbears.bbplay.screens.news.domain.model.VkInfo
import mobi.blackbears.bbplay.screens.news.fragment.adapter.NewsItem

interface CreateNewsItemsUseCase {
    fun createNewsItems(vkInfo: VkInfo): List<NewsItem>
}