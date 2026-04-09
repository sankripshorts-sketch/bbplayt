package mobi.blackbears.bbplay.screens.news.fragment.adapter

import mobi.blackbears.bbplay.common.extensions.emptyString
import mobi.blackbears.bbplay.common.fragment.adapter.Item
import mobi.blackbears.bbplay.screens.news.domain.model.news.*
import java.time.LocalDateTime

data class NewsItem(
    val postId: Long,
    val commentsCount: Long,
    val text: String,
    val date: LocalDateTime,
    val photos: List<VkItems.Photo> = listOf(),
    val videos: List<VkItems.Video> = listOf(),
    val imagesCount: Int = 0,
    val link: VkItems.Link? = null,
    val poll: VkItems.Poll? = null,

    //Пока данные элементы не используются, но тз меняют постоянно. Пока оставляю.
    val attachments: List<VkItems>,
    val copyHistory: List<VkRepostPost>
    ) : Item() {
    companion object {
        val EMPTY = NewsItem(-1, 0, emptyString(), LocalDateTime.now(), attachments = listOf(), copyHistory =  listOf())
    }
}
