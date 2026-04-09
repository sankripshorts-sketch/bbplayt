package mobi.blackbears.bbplay.screens.booking.presentation.state

import mobi.blackbears.bbplay.screens.booking.domain.model.AreaZone
import mobi.blackbears.bbplay.screens.booking.domain.model.Pc

data class AreaState(
    val isEnabled: Boolean = false,
    val alpha: Float = 0.4f,
    val areas: List<AreaZone> = listOf(),
    val pcSelected: Pc? = null
)