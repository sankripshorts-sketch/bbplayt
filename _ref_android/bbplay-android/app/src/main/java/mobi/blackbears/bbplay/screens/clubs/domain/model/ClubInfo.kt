package mobi.blackbears.bbplay.screens.clubs.domain.model

data class ClubInfo(
    val clubId: String,
    val license_email: String,
    val license_phone: String,
    val license_address: String,
    val license_latlng: String,
    val license_website: String,
    val lat: Double,
    val lng: Double
) {
    companion object {
        val EMPTY = ClubInfo(
            "-1",
            license_email = "",
            license_phone = "",
            license_address = "",
            license_latlng = "",
            license_website = "",
            lat = 123.01,
            lng = 123.02
        )
    }
}