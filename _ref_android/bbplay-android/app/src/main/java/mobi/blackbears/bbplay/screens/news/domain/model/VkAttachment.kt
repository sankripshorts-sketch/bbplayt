package mobi.blackbears.bbplay.screens.news.domain.model

data class VkAttachment(
    val type: VkAttachmentType,
    val photo: VkPhoto? = null,
    val link: VkLink? = null,
    val video: VkVideo? = null,
    val poll: VkPoll? = null
)