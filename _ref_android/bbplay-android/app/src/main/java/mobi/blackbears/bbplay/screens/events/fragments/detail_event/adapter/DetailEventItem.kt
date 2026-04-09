package mobi.blackbears.bbplay.screens.events.fragments.detail_event.adapter

import androidx.annotation.ColorRes
import mobi.blackbears.bbplay.common.fragment.adapter.Item
import mobi.blackbears.bbplay.screens.events.domain.model.MemberOfEvent

data class DetailEventItem(
    @ColorRes
    val colorBackgroundRes: Int,
    @ColorRes
    val colorText: Int,
    val member: MemberOfEvent
) : Item()
