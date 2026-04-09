package mobi.blackbears.bbplay.screens.clubs.data.mapper

import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.screens.clubs.data.model.Info
import mobi.blackbears.bbplay.screens.clubs.domain.model.ClubInfo
import javax.inject.Inject

class ClubsMapper @Inject constructor() : Mapper<Info, ClubInfo> {

    override fun transform(data: Info): ClubInfo =
        ClubInfo(
            clubId = data.objectID.toString(),
            license_email = data.licenseEmail,
            license_phone = data.licensePhone,
            license_address = data.licenseAddress,
            license_latlng = data.licenseLatlng,
            license_website = data.licenseWebsite,
            lat = data.lat,
            lng = data.lng
        )

}