package mobi.blackbears.bbplay.screens.booking.data.model

import com.google.gson.annotations.SerializedName

data class RoomResponse(
    @SerializedName("area_icafe_id")
    val areaIcafeId: Long,

    @SerializedName("area_name")
    val areaName: AreaNameTypeResponse,

    @SerializedName("area_height")
    val areaHeight: Long,

    @SerializedName("area_width")
    val areaWidth: Long,

    @SerializedName("area_frame_x")
    val areaFrameX: Long,

    @SerializedName("area_frame_y")
    val areaFrameY: Long,

    @SerializedName("area_frame_width")
    val areaFrameWidth: Long,

    @SerializedName("area_frame_height")
    val areaFrameHeight: Long
)