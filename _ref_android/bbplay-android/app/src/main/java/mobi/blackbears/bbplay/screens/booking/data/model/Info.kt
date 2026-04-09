package mobi.blackbears.bbplay.screens.booking.data.model

import com.google.gson.JsonElement
import com.google.gson.annotations.SerializedName

data class Info(
    @SerializedName("license_name")
    val licenseName: String,

    @SerializedName("license_machine")
    val licenseMachine: String,

    @SerializedName("object_id")
    val objectID: Long,

    @SerializedName("license_type")
    val licenseType: Long,

    @SerializedName("license_expired")
    val licenseExpired: String,

    @SerializedName("license_status")
    val licenseStatus: Long,

    @SerializedName("license_region")
    val licenseRegion: Long,

    @SerializedName("license_last_ip")
    val licenseLastIP: String,

    @SerializedName("license_icafename")
    val licenseIcafename: String,

    @SerializedName("license_email")
    val licenseEmail: String,

    @SerializedName("license_contact")
    val licenseContact: String,

    @SerializedName("license_phone")
    val licensePhone: String,

    @SerializedName("license_address")
    val licenseAddress: String,

    @SerializedName("license_last_active")
    val licenseLastActive: String,

    @SerializedName("license_last_reset")
    val licenseLastReset: String,

    @SerializedName("license_allow_auto_download")
    val licenseAllowAutoDownload: Long,

    @SerializedName("license_max_upload_speed_kb")
    val licenseMaxUploadSpeedKB: Long,

    @SerializedName("license_max_torrents_download")
    val licenseMaxTorrentsDownload: Long,

    @SerializedName("license_user_id")
    val licenseUserID: JsonElement? = null,

    @SerializedName("license_pcs")
    val licensePcs: Long,

    @SerializedName("license_created")
    val licenseCreated: String,

    @SerializedName("license_reseller")
    val licenseReseller: String,

    @SerializedName("license_ccboot")
    val licenseCcboot: String,

    @SerializedName("license_balance")
    val licenseBalance: Long,

    @SerializedName("license_orderid")
    val licenseOrderid: String,

    @SerializedName("license_autopay")
    val licenseAutopay: Long,

    @SerializedName("license_ccdisk")
    val licenseCcdisk: JsonElement? = null,

    @SerializedName("license_enable_quick_update")
    val licenseEnableQuickUpdate: Long,

    @SerializedName("license_allow_update_time")
    val licenseAllowUpdateTime: JsonElement? = null,

    @SerializedName("license_server_code")
    val licenseServerCode: String,

    @SerializedName("license_cloud_servers")
    val licenseCloudServers: String,

    @SerializedName("license_product")
    val licenseProduct: Long,

    @SerializedName("license_comment")
    val licenseComment: String,

    @SerializedName("license_country")
    val licenseCountry: String,

    @SerializedName("license_company_id")
    val licenseCompanyID: Long,

    @SerializedName("cafe_discord_account")
    val cafeDiscordAccount: String,

    @SerializedName("license_server_position")
    val licenseServerPosition: String,

    @SerializedName("license_latlng")
    val licenseLatlng: String,

    @SerializedName("license_website")
    val licenseWebsite: String,

    @SerializedName("license_country_name")
    val licenseCountryName: String,

    @SerializedName("lat")
    val lat: Double,

    @SerializedName("lng")
    val lng: Double

)
