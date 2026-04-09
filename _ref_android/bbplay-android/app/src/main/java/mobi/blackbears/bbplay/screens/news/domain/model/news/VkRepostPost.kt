package mobi.blackbears.bbplay.screens.news.domain.model.news

import java.time.LocalDateTime

data class VkRepostPost(
    val items: List<VkItems>?,
    val date: LocalDateTime,
    val text: String
)