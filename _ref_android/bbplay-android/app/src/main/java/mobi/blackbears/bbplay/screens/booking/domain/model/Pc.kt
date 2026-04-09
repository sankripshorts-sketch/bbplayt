package mobi.blackbears.bbplay.screens.booking.domain.model

data class Pc(
    val pcIcafeId: Long,
    val pcIp: String,
    val pcName: String,
    val pcComment: String,
    val pcConsoleType: Long,
    val pcGroupId: Long,
    val pcAreaName: AreaTypeName,
    val pcBoxPosition: String,
    val pcBoxTop: Long,
    val pcBoxLeft: Long,
    val pcEnabled: Boolean,
    val pcMiningEnabled: Long,
    val pcMiningTool: String,
    val pcMiningOptions: String,
    val statusConnectTimeLocal: String?,
    val statusDisconnectTimeLocal: String?,
    val statusConnectTimeDuration: String?,
    val statusConnectTimeLeft: String?,
    val memberId: Long?,
    val memberIcafeId: Long?,
    val memberAccount: String?,
    val memberBalance: String?,
    val memberBalanceBonus: String?,
    val memberGroupId: Long?,
    val memberGroupName: String?,
    val memberGroupDesc: String?,
    val memberGroupDiscountRate: Long?,
    val offerInUsing: String?,
    val statusTotalTime: String?,

    val isSelected: Boolean = false,
    //Свободен ли компьютер в определенную дату и время, которую выбрал пользователь
    val isPcFreeForTime: Boolean = true
)