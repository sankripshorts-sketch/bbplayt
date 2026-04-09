package mobi.blackbears.bbplay.common.data.model

import com.google.gson.JsonElement
import com.google.gson.annotations.SerializedName

data class MemberResponse (
    @SerializedName("member_id")
    val memberId: Long,

    @SerializedName("member_icafe_id")
    val memberIcafeID: Long,

    @SerializedName("member_account")
    val memberAccount: String,

    @SerializedName("member_balance")
    val memberBalance: String,

    @SerializedName("member_first_name")
    val memberFirstName: String,

    @SerializedName("member_last_name")
    val memberLastName: String,

    @SerializedName("member_birthday")
    val memberBirthday: String,

    @SerializedName("member_expire_time_local")
    val memberExpireTimeLocal: String,

    @SerializedName("member_is_active")
    val memberIsActive: Long,

    @SerializedName("member_photo")
    val memberPhoto: JsonElement? = null,

    @SerializedName("member_email")
    val memberEmail: String,

    @SerializedName("member_telegram_username")
    val memberTelegramUsername: String,

    @SerializedName("member_telegram_username_valid")
    val memberTelegramUsernameValid: Long,

    @SerializedName("member_phone")
    val memberPhone: String,

    @SerializedName("member_id_card")
    val memberIDCard: String,

    @SerializedName("member_points")
    val memberPoints: String,

    @SerializedName("member_create")
    val memberCreate: String,

    @SerializedName("member_update")
    val memberUpdate: String,

    @SerializedName("member_group_id")
    val memberGroupID: Long,

    @SerializedName("member_balance_bonus")
    val memberBalanceBonus: String,

    @SerializedName("member_coin_balance")
    val memberCoinBalance: String,

    @SerializedName("member_sex")
    val memberSex: Long,

    @SerializedName("member_comments")
    val memberComments: JsonElement? = null,

    @SerializedName("member_address")
    val memberAddress: String,

    @SerializedName("member_company_id")
    val memberCompanyID: Long,

    @SerializedName("member_loan")
    val memberLoan: String,

    @SerializedName("member_recent_played")
    val memberRecentPlayed: JsonElement? = null,

    @SerializedName("member_id_icafe_id")
    val memberIDIcafeID: String,

    @SerializedName("member_is_logined")
    val memberIsLogined: Long,

    @SerializedName("member_group_discount_rate")
    val memberGroupDiscountRate: Long,

    @SerializedName("member_group_name")
    val memberGroupName: String,

    val offers: Long,

    @SerializedName("member_is_expired")
    val memberIsExpired: Long,

    @SerializedName("left_time")
    val leftTime: String,

    @SerializedName("is_owner")
    val isOwner: Boolean,

    @SerializedName("member_center_name")
    val memberCenterName: String,

    @SerializedName("member_is_first_payment")
    val isFirstPayment: Boolean,
)