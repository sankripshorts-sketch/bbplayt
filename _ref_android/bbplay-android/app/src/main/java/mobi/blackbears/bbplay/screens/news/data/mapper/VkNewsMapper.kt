package mobi.blackbears.bbplay.screens.news.data.mapper

import mobi.blackbears.bbplay.common.extensions.emptyString
import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.screens.news.data.model.*
import mobi.blackbears.bbplay.screens.news.domain.model.*
import java.time.LocalDateTime
import java.time.OffsetDateTime
import javax.inject.Inject

class VkNewsMapper @Inject constructor(): Mapper<VkNewsResponse, VkInfo> {
    override fun transform(data: VkNewsResponse): VkInfo = data.vkResponse.run {
        VkInfo(
            count = count,
            items = items.map(::toVkNews)
        )
    }

    private fun toVkNews(data: NewsResponse): VkNews = data.run {
        VkNews(
            isPinned = isPinned,
            type = type,
            commentsCount = comments.count,
            attachments = attachments?.filter { it.type != null }?.map(::toVkAttachment),
            date = getLocalDateTimeByLong(date),
            fromID = fromID,
            id = id,
            ownerID = ownerID,
            postType = postType,
            text = text,
            copyHistory = copyHistory?.map(::toVkCopyHistory)
        )
    }

    private fun toVkAttachment(data: AttachmentResponse): VkAttachment = data.run {
        VkAttachment(
            type = toVkType(type),
            photo = toVkPhoto(photo),
            link = toVkLink(link),
            video = toVkVideo(video),
            poll = toVkPoll(pollResponse),
        )
    }

    private fun toVkType(type: AttachmentTypeResponse): VkAttachmentType = type.run {
        when (type) {
            AttachmentTypeResponse.LINK -> VkAttachmentType.LINK
            AttachmentTypeResponse.PHOTO -> VkAttachmentType.PHOTO
            AttachmentTypeResponse.VIDEO -> VkAttachmentType.VIDEO
            AttachmentTypeResponse.POLL -> VkAttachmentType.POLL
        }
    }

    private fun toVkPhoto(photo: PhotoResponse?): VkPhoto? = photo?.run {
        VkPhoto(
            albumID = albumID,
            date = getLocalDateTimeByLong(date),
            id = id,
            ownerID = ownerID,
            sizes = sizes.map(::toVkSize),
            text = text,
            userID = userID,
            hasTags = hasTags,
            accessKey = accessKey,
            postID = postID
        )
    }

    private fun toVkSize(size: SizeResponse): VkSize = size.run {
        VkSize(
            height = height,
            type = toVkSizeType(type),
            width = width,
            url = url,
            withPadding = withPadding,
        )
    }

    private fun toVkSizeType(sizeType: SizeTypeResponse?): VkSizeType? = sizeType?.run {
        when (sizeType) {
            SizeTypeResponse.A -> VkSizeType.A
            SizeTypeResponse.B -> VkSizeType.B
            SizeTypeResponse.C -> VkSizeType.C
            SizeTypeResponse.D -> VkSizeType.D
            SizeTypeResponse.E -> VkSizeType.E
            SizeTypeResponse.K -> VkSizeType.K
            SizeTypeResponse.L -> VkSizeType.L
            SizeTypeResponse.M -> VkSizeType.M
            SizeTypeResponse.O -> VkSizeType.O
            SizeTypeResponse.P -> VkSizeType.P
            SizeTypeResponse.Q -> VkSizeType.Q
            SizeTypeResponse.R -> VkSizeType.R
            SizeTypeResponse.S -> VkSizeType.S
            SizeTypeResponse.W -> VkSizeType.W
            SizeTypeResponse.X -> VkSizeType.X
            SizeTypeResponse.Y -> VkSizeType.Y
            SizeTypeResponse.Z -> VkSizeType.Z
        }
    }

    private fun toVkLink(link: LinkResponse?): VkLink? = link?.run {
        VkLink(
            url = url,
            description = description ?: emptyString(),
            photo = toVkPhoto(photo),
            title = title,
            target = target,
            caption = caption,
        )
    }

    private fun toVkVideo(video: VideoResponse?): VkVideo? = video?.run {
        VkVideo(
            accessKey = accessKey ?: emptyString(),
            canComment = canComment,
            canLike = canLike,
            canRepost = canRepost,
            canSubscribe = canSubscribe,
            canAddToFaves = canAddToFaves,
            canAdd = canAdd,
            date = getLocalDateTimeByLong(date),
            description = description,
            duration = duration,
            image = image?.map(::toVkSize) ?: emptyList(),
            firstFrame = firstFrame?.map(::toVkSize) ?: emptyList(),
            width = width,
            height = height,
            id = id,
            ownerID = ownerID,
            title = title,
            trackCode = trackCode,
            canDislike = canDislike,
            ovID = ovID,
            liveStatus = liveStatus,
        )
    }

    private fun toVkPoll(poll: PollResponse?): VkPoll? = poll?.run {
        VkPoll(
            multiple = multiple,
            endDate = endDate,
            closed = closed,
            isBoard = isBoard,
            canEdit = canEdit,
            canVote = canVote,
            canReport = canReport,
            canShare = canShare,
            created = created,
            id = id,
            ownerID = ownerID,
            question = question,
            votes = votes,
            disableUnvote = disableUnvote,
            anonymous = anonymous,
            embedHash = embedHash,
            answers = answers.map(::toVkAnswer),
            authorID = authorID,
        )
    }

    private fun toVkAnswer(answer: AnswerResponse): VkAnswer = answer.run {
        VkAnswer(
            id = id,
            rate = rate,
            text = text,
            votes = votes
        )
    }

    private fun toVkCopyHistory(copyHistory: CopyHistoryResponse): VkCopyHistory =
        copyHistory.run {
            VkCopyHistory(
                type = type,
                attachments = attachments?.map(::toVkAttachment),
                date = getLocalDateTimeByLong(date),
                fromID = fromID,
                id = id,
                ownerID = ownerID,
                postType = postType,
                text = text,
                signerID = signerID,
                isDeleted = isDeleted,
                deletedReason = deletedReason,
                deletedDetails = deletedDetails,
            )
        }

    private fun getLocalDateTimeByLong(dateLongSeconds: Long): LocalDateTime =
        LocalDateTime.ofEpochSecond(dateLongSeconds, 1000, OffsetDateTime.now().offset)
}