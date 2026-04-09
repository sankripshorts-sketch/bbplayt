package mobi.blackbears.bbplay.screens.clubs.presentation.adapter

import android.view.ViewGroup
import mobi.blackbears.bbplay.common.fragment.adapter.GeneralListAdapter
import mobi.blackbears.bbplay.common.fragment.adapter.Item

class ClubsAdapter(
    private val onAddressClick: (lat: Double, lng: Double) -> Unit,
    private val onPhoneClick: (phone: String) -> Unit,
    private val onWebSiteClick: (url: String) -> Unit
) : GeneralListAdapter<Item, ClubViewHolder>() {
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ClubViewHolder =
        ClubViewHolder(parent)

    override fun onBindViewHolder(holder: ClubViewHolder, position: Int) {
        holder.bind(getItem(position), onAddressClick, onPhoneClick, onWebSiteClick)
    }
}