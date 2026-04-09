package mobi.blackbears.bbplay.screens.news.domain.model.news

import mobi.blackbears.bbplay.screens.news.domain.model.VkAnswer

sealed interface VkItems {
    data class Photo(val imageUrl: String): VkItems

    data class Video(
        val imageVideoUrl: String
    ): VkItems

    data class Link(
        val linkUrl: String,
        val title: String,
        val description: String,
        val photo: Photo?
    ) : VkItems

    data class Poll(
        val question: String,
        val votes: Long,
        val answers: List<VkAnswer>
    ): VkItems
}