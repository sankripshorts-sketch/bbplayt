package mobi.blackbears.bbplay.screens.news.domain.model

data class VkLink(
    val url: String,
    val description: String,
    val photo: VkPhoto? = null,
    val title: String,
    val target: String? = null,
    val caption: String? = null
)