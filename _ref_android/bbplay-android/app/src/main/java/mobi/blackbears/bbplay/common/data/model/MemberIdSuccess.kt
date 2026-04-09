package mobi.blackbears.bbplay.common.data.model

import com.google.gson.annotations.SerializedName

data class MemberIdSuccess(
    @SerializedName("member_id")
    val memberId: Long
)