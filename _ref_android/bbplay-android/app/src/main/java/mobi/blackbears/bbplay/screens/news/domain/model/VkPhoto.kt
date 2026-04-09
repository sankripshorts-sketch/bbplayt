package mobi.blackbears.bbplay.screens.news.domain.model

import java.time.LocalDateTime

data class VkPhoto(
    val albumID: Long,
    val date: LocalDateTime,
    val id: Long,
    val ownerID: Long,
    val sizes: List<VkSize>,
    val text: String,
    val userID: Long? = null,
    val hasTags: Boolean,
    val accessKey: String? = null,
    val postID: Long? = null
)