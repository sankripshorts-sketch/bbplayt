package mobi.blackbears.bbplay.screens.booking.data.mapper

import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.screens.booking.data.model.*
import mobi.blackbears.bbplay.screens.booking.domain.model.*
import javax.inject.Inject

class AreaWithPcsMapper @Inject constructor(): Mapper<AreaModel, AreaZone> {
    override fun transform(data: AreaModel): AreaZone {
        val room = data.area
        val pcsInfo = data.pcInfo

        return room.run {
            AreaZone(
                areaName = toAreaTypeName(areaName),
                areaFrameX = areaFrameX,
                areaFrameY = areaFrameY,
                areaFrameWidth = areaFrameWidth,
                areaFrameHeight = areaFrameHeight,
                pcs = pcsInfo.pcList.filter { it.pcAreaName == room.areaName }.map(::pcResponseToPc),
                areaWidth = areaWidth,
                areaHeight = areaHeight
            )
        }
    }

    private fun toAreaTypeName(data: AreaNameTypeResponse): AreaTypeName =
        when(data) {
            AreaNameTypeResponse.BOOTCAMP_1 -> AreaTypeName.BOOTCAMP_1
            AreaNameTypeResponse.GAME_ZONE -> AreaTypeName.GAME_ZONE
            AreaNameTypeResponse.BOOTCAMP_2 -> AreaTypeName.BOOTCAMP_2
        }

    private fun pcResponseToPc(data: PcResponse): Pc = data.run {
        Pc(
            pcIcafeId = pcIcafeId,
            pcIp = pcIp,
            pcName = pcName,
            pcComment = pcComment,
            pcConsoleType = pcConsoleType,
            pcGroupId = pcGroupId,
            pcAreaName = toAreaTypeName(pcAreaName),
            pcBoxPosition = pcBoxPosition,
            pcBoxTop = pcBoxTop,
            pcBoxLeft = pcBoxLeft,
            pcEnabled = pcEnabled == 1L,
            pcMiningEnabled = pcMiningEnabled,
            pcMiningTool = pcMiningTool,
            pcMiningOptions = pcMiningOptions,
            statusConnectTimeLocal = statusConnectTimeLocal,
            statusDisconnectTimeLocal = statusDisconnectTimeLocal,
            statusConnectTimeDuration = statusConnectTimeDuration,
            statusConnectTimeLeft = statusConnectTimeLeft,
            memberId = memberId,
            memberIcafeId = memberIcafeId,
            memberAccount = memberAccount,
            memberBalance = memberBalance,
            memberBalanceBonus = memberBalanceBonus,
            memberGroupId = memberGroupId,
            memberGroupName = memberGroupName,
            memberGroupDesc = memberGroupDesc,
            memberGroupDiscountRate = memberGroupDiscountRate,
            offerInUsing = offerInUsing,
            statusTotalTime = statusTotalTime
        )
    }
}