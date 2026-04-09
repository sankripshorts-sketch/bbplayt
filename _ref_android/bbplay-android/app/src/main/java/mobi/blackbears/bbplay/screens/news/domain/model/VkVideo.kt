package mobi.blackbears.bbplay.screens.news.domain.model

import java.time.LocalDateTime

data class VkVideo(
    val accessKey: String,
    val canComment: Long,
    val canLike: Long,
    val canRepost: Long,
    val canSubscribe: Long,
    val canAddToFaves: Long,
    val canAdd: Long,
    val date: LocalDateTime,
    val description: String,
    val duration: Long,
    val image: List<VkSize>,
    val firstFrame: List<VkSize>,
    val width: Long,
    val height: Long,
    val id: Long,
    val ownerID: Long,
    val title: String,
    val trackCode: String,
    val canDislike: Long,
    val ovID: String? = null,
    val liveStatus: String? = null
)