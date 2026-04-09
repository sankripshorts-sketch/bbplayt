package mobi.blackbears.bbplay.screens.booking.domain.model

data class AreaZone(
    val areaName: AreaTypeName,
    val areaFrameX: Long,
    val areaFrameY: Long,
    val areaFrameWidth: Long,
    val areaFrameHeight: Long,
    val pcs: List<Pc>,

    //Пока приходит по 0
    val areaWidth: Long,
    val areaHeight: Long
)