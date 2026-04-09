package mobi.blackbears.bbplay.screens.booking.data.model

import com.google.gson.annotations.SerializedName

enum class AreaNameTypeResponse(val pcAreaName: String) {
    @SerializedName("BootCamp 1")
    BOOTCAMP_1("BootCamp 1"),

    @SerializedName("GameZone")
    GAME_ZONE("GameZone"),

    @SerializedName("BootCamp 2")
    BOOTCAMP_2("BootCamp 2")
}