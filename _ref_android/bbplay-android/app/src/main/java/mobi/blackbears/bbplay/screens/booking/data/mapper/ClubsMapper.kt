package mobi.blackbears.bbplay.screens.booking.data.mapper

import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.screens.booking.data.model.Info
import mobi.blackbears.bbplay.screens.booking.domain.model.ClubInfo
import javax.inject.Inject

class ClubsMapper @Inject constructor() : Mapper<Info, ClubInfo> {

    override fun transform(data: Info): ClubInfo =
        ClubInfo(
            license_email = data.licenseEmail,
            license_phone = data.licensePhone,
            license_address = data.licenseAddress,
            license_latlng = data.licenseLatlng,
            license_website = data.licenseWebsite,
            lat = data.lat,
            lng = data.lng
        )
}