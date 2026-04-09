package mobi.blackbears.bbplay.screens.news.domain.model

import java.time.LocalDateTime

data class VkNews(
    val isPinned: Int? = null,
    val type: String,
    val commentsCount: Long,
    val attachments: List<VkAttachment>?,
    val date: LocalDateTime,
    val fromID: Long,
    val id: Long,
    val ownerID: Long,
    val postType: String,
    val text: String,
    val copyHistory: List<VkCopyHistory>?
)