package mobi.blackbears.bbplay.screens.news.domain.model

data class VkPoll(
    val multiple: Boolean,
    val endDate: Long,
    val closed: Boolean,
    val isBoard: Boolean,
    val canEdit: Boolean,
    val canVote: Boolean,
    val canReport: Boolean,
    val canShare: Boolean,
    val created: Long,
    val id: Long,
    val ownerID: Long,
    val question: String,
    val votes: Long,
    val disableUnvote: Boolean,
    val anonymous: Boolean,
    val embedHash: String,
    val answers: List<VkAnswer>,
    val authorID: Long
)