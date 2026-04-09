package mobi.blackbears.bbplay.screens.news.data.model

import com.google.gson.annotations.SerializedName

data class NewsResponse(
    @SerializedName("is_pinned")
    val isPinned: Int? = null,

    @SerializedName("type")
    val type: String,

    @SerializedName("comments")
    val comments: VkCommentsResponse,

    @SerializedName("attachments")
    val attachments: List<AttachmentResponse>?,

    @SerializedName("date")
    val date: Long,

    @SerializedName("from_id")
    val fromID: Long,

    @SerializedName("id")
    val id: Long,

    @SerializedName("owner_id")
    val ownerID: Long,

    @SerializedName("post_type")
    val postType: String,

    @SerializedName("text")
    val text: String,

    @SerializedName("copy_history")
    val copyHistory: List<CopyHistoryResponse>?
)