package mobi.blackbears.bbplay.screens.booking.data.model

import com.google.gson.annotations.SerializedName

/**
 * @param pcEnabled отвечает за ремонт пк. 0 - на ремонте(выключен), 1 - нет(включен).
 */
data class PcResponse(
    @SerializedName("pc_icafe_id")
    val pcIcafeId: Long,

    @SerializedName("pc_ip")
    val pcIp: String,

    @SerializedName("pc_name")
    val pcName: String,

    @SerializedName("pc_mac")
    val pcMac: String,

    @SerializedName("pc_comment")
    val pcComment: String,

    @SerializedName("pc_console_type")
    val pcConsoleType: Long,

    @SerializedName("pc_group_id")
    val pcGroupId: Long,

    @SerializedName("pc_area_name")
    val pcAreaName: AreaNameTypeResponse,

    @SerializedName("pc_box_position")
    val pcBoxPosition: String,

    @SerializedName("pc_box_top")
    val pcBoxTop: Long,

    @SerializedName("pc_box_left")
    val pcBoxLeft: Long,

    @SerializedName("pc_enabled")
    val pcEnabled: Long,

    @SerializedName("pc_mining_enabled")
    val pcMiningEnabled: Long,

    @SerializedName("pc_mining_tool")
    val pcMiningTool: String,

    @SerializedName("pc_mining_options")
    val pcMiningOptions: String,

    @SerializedName("status_connect_time_local")
    val statusConnectTimeLocal: String? = null,

    @SerializedName("status_disconnect_time_local")
    val statusDisconnectTimeLocal: String? = null,

    @SerializedName("status_connect_time_duration")
    val statusConnectTimeDuration: String? = null,

    @SerializedName("status_connect_time_left")
    val statusConnectTimeLeft: String? = null,

    @SerializedName("member_id")
    val memberId: Long? = null,

    @SerializedName("member_icafe_id")
    val memberIcafeId: Long? = null,

    @SerializedName("member_account")
    val memberAccount: String? = null,

    @SerializedName("member_balance")
    val memberBalance: String? = null,

    @SerializedName("member_balance_bonus")
    val memberBalanceBonus: String? = null,

    @SerializedName("member_group_id")
    val memberGroupId: Long? = null,

    @SerializedName("member_group_name")
    val memberGroupName: String? = null,

    @SerializedName("member_group_desc")
    val memberGroupDesc: String? = null,

    @SerializedName("member_group_discount_rate")
    val memberGroupDiscountRate: Long? = null,

    @SerializedName("offer_in_using")
    val offerInUsing: String? = null,

    @SerializedName("status_total_time")
    val statusTotalTime: String? = null
)