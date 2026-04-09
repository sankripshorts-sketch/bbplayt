package mobi.blackbears.bbplay.screens.news.domain.model

data class VkSize(
    val height: Long,
    val type: VkSizeType? = null,
    val width: Long,
    val url: String,
    val withPadding: Long? = null
)
