package mobi.blackbears.bbplay.screens.news.domain.model

import java.time.LocalDateTime

data class VkCopyHistory(
    val type: String,
    val attachments: List<VkAttachment>?,
    val date: LocalDateTime,
    val fromID: Long,
    val id: Long,
    val ownerID: Long,
    val postType: String,
    val text: String,
    val signerID: Long? = null,
    val isDeleted: Boolean? = null,
    val deletedReason: String? = null,
    val deletedDetails: String? = null
)