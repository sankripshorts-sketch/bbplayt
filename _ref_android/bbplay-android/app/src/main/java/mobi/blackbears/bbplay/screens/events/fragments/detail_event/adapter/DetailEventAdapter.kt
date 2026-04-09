package mobi.blackbears.bbplay.screens.events.fragments.detail_event.adapter

import android.view.ViewGroup
import mobi.blackbears.bbplay.common.fragment.adapter.GeneralListAdapter

class DetailEventAdapter : GeneralListAdapter<DetailEventItem, DetailEventlViewHolder>() {
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): DetailEventlViewHolder =
        DetailEventlViewHolder(parent)

    override fun onBindViewHolder(holder: DetailEventlViewHolder, position: Int) {
        holder.bind(getItem(position))
    }
}