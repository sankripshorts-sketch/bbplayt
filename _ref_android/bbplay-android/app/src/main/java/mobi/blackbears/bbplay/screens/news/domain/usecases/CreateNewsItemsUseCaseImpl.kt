package mobi.blackbears.bbplay.screens.news.domain.usecases

import mobi.blackbears.bbplay.screens.news.domain.model.*
import mobi.blackbears.bbplay.screens.news.domain.model.news.*
import mobi.blackbears.bbplay.screens.news.fragment.adapter.NewsItem
import javax.inject.Inject

class CreateNewsItemsUseCaseImpl @Inject constructor() : CreateNewsItemsUseCase {
    override fun createNewsItems(vkInfo: VkInfo): List<NewsItem> {
        return vkInfo.items
            .map(::createNewsItem)
    }

    private fun createNewsItem(vkNews: VkNews): NewsItem = vkNews.run {
        val mapResult = getAllEntitiesFromPost(vkNews)

        val photos = mapResult[VkAttachmentType.PHOTO]?.map { it as VkItems.Photo }
        val videos = mapResult[VkAttachmentType.VIDEO]?.map { it as VkItems.Video }
        val link = mapResult[VkAttachmentType.LINK]?.map { it as VkItems.Link }?.firstOrNull()
        val poll = mapResult[VkAttachmentType.POLL]?.map { it as VkItems.Poll }?.firstOrNull()

        NewsItem(
            postId = id,
            commentsCount = commentsCount,
            text = getAllTextFromPost(vkNews),
            date = date,
            photos = photos ?: listOf(),
            videos = videos ?: listOf(),
            imagesCount = (photos?.size ?: 0) + (videos?.size ?: 0),
            link = link,
            poll = poll,

            //Пока данные элементы не используются, но тз меняют постоянно. Пока оставляю.
            attachments = createVkItems(attachments),
            copyHistory = createRepostPosts(copyHistory)
        )
    }

    private fun getAllEntitiesFromPost(vkNews: VkNews): Map<VkAttachmentType, List<VkItems>> {
        val resultMap = hashMapOf<VkAttachmentType, List<VkItems>>()

        val photos = mutableListOf<VkItems?>()
        val videos = mutableListOf<VkItems?>()
        val links = mutableListOf<VkItems?>()
        val polls = mutableListOf<VkItems?>()

        vkNews.attachments?.forEach {
            when (val vkItem = getVkItemAttachmentByType(it)) {
                is VkItems.Photo -> photos.add(vkItem)
                is VkItems.Video -> videos.add(vkItem)
                is VkItems.Link -> links.add(vkItem)
                is VkItems.Poll -> polls.add(vkItem)
                else -> { }
            }
        }

        vkNews.copyHistory?.forEach {
            it.attachments?.forEach { vkAttachment ->
                when (val vkItem = getVkItemAttachmentByType(vkAttachment)) {
                    is VkItems.Photo -> photos.add(vkItem)
                    is VkItems.Video -> videos.add(vkItem)
                    is VkItems.Link -> links.add(vkItem)
                    is VkItems.Poll -> polls.add(vkItem)
                    else -> { }
                }
            }
        }

        resultMap[VkAttachmentType.PHOTO] = photos.filterNotNull()
        resultMap[VkAttachmentType.VIDEO] = videos.filterNotNull()
        resultMap[VkAttachmentType.LINK] = links.filterNotNull()
        resultMap[VkAttachmentType.POLL] = polls.filterNotNull()
        return resultMap
    }

    private fun getVkItemAttachmentByType(vkAttachment: VkAttachment): VkItems? =
        when(vkAttachment.type) {
            VkAttachmentType.PHOTO -> createPhotoItem(vkAttachment.photo)
            VkAttachmentType.VIDEO -> createVideoItem(vkAttachment.video)
            VkAttachmentType.LINK -> createLinkItem(vkAttachment.link)
            VkAttachmentType.POLL -> createPollItem(vkAttachment.poll)
        }

    private fun createPhotoItem(photo: VkPhoto?): VkItems? {
        if (photo == null) return null
        val imageUrl =
            photo.sizes.find { it.type == VkSizeType.Z }?.url ?:
            photo.sizes.find { it.type == VkSizeType.Y }?.url ?: return null
        return VkItems.Photo(imageUrl)
    }

    private fun createVideoItem(video: VkVideo?): VkItems? {
        if (video == null) return null
        val videoImageUrl =
            video.image.find { it.width > 1024L }?.url ?:
            video.image.find { it.width > 750 }?.url ?: return null
        return VkItems.Video(videoImageUrl)
    }

    private fun createLinkItem(link: VkLink?): VkItems? {
        if (link == null) return null
        return link.run {
            VkItems.Link(
                linkUrl = url,
                title = title,
                description = description,
                photo = (createPhotoItem(photo) as? VkItems.Photo)
            )
        }
    }

    private fun createPollItem(poll: VkPoll?): VkItems? {
        if (poll == null) return null
        return poll.run {
            VkItems.Poll(
                question = question,
                votes = votes,
                answers = answers
            )
        }
    }

    private fun getAllTextFromPost(vkNews: VkNews): String {
        val textResult = StringBuilder()
        val textPost = vkNews.text

        vkNews.copyHistory?.forEach { textResult.append(it.text) }
        if (textResult.isNotBlank() && textPost.isNotBlank()) textResult.append("\n\n")
        textResult.append(textPost)
        return textResult.toString()
    }


    //region Attachment and copyHistory fields
    private fun createVkItems(attachments: List<VkAttachment>?): List<VkItems> {
        if (attachments == null) return listOf()
        return attachments
            .map(::getVkItemAttachmentByType)
            .filterNotNull()
    }

    private fun createRepostPosts(copyHistory: List<VkCopyHistory>?): List<VkRepostPost> {
        if (copyHistory == null) return emptyList()
        return copyHistory.map(::toRepostPost)
    }

    private fun toRepostPost(vkCopyHistory: VkCopyHistory): VkRepostPost = vkCopyHistory.run {
        VkRepostPost(
            items = createVkItems(attachments),
            date = date,
            text = text,
        )
    }
    //endregion
}