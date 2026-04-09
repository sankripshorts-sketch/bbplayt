package mobi.blackbears.bbplay.screens.news.data.model

import com.google.gson.annotations.SerializedName

data class CopyHistoryResponse(

    @SerializedName("type")
    val type: String,

    @SerializedName("attachments")
    val attachments: List<AttachmentResponse>? ,

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

    @SerializedName("signer_id")
    val signerID: Long? = null,

    @SerializedName("is_deleted")
    val isDeleted: Boolean? = null,

    @SerializedName("deleted_reason")
    val deletedReason: String? = null,

    @SerializedName("deleted_details")
    val deletedDetails: String? = null
)