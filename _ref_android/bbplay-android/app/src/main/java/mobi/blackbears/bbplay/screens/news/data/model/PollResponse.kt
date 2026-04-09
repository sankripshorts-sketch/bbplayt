package mobi.blackbears.bbplay.screens.news.data.model

import com.google.gson.annotations.SerializedName

data class PollResponse(
    @SerializedName("multiple")
    val multiple: Boolean,

    @SerializedName("end_date")
    val endDate: Long,

    @SerializedName("closed")
    val closed: Boolean,

    @SerializedName("is_board")
    val isBoard: Boolean,

    @SerializedName("can_edit")
    val canEdit: Boolean,

    @SerializedName("can_vote")
    val canVote: Boolean,

    @SerializedName("can_report")
    val canReport: Boolean,

    @SerializedName("can_share")
    val canShare: Boolean,

    @SerializedName("created")
    val created: Long,

    @SerializedName("id")
    val id: Long,

    @SerializedName("owner_id")
    val ownerID: Long,

    @SerializedName("question")
    val question: String,

    @SerializedName("votes")
    val votes: Long,

    @SerializedName("disable_unvote")
    val disableUnvote: Boolean,

    @SerializedName("anonymous")
    val anonymous: Boolean,

    @SerializedName("embed_hash")
    val embedHash: String,

    @SerializedName("answers")
    val answers: List<AnswerResponse>,

    @SerializedName("author_id")
    val authorID: Long
)