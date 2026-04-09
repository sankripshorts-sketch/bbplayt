package mobi.blackbears.bbplay.screens.events.fragments.event.adapter

import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import mobi.blackbears.bbplay.common.fragment.adapter.GeneralListAdapter
import mobi.blackbears.bbplay.screens.events.fragments.event.model.EventItem

private const val HEADER_ITEM = 1
private const val NOW_EMPTY_EVENT = 2
private const val EVENT = 3
private const val COMPLETED_EVENT = 4

class EventListAdapter(
    private val itemClickListener: (String) -> Unit
): GeneralListAdapter<EventItem, RecyclerView.ViewHolder>() {
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder =
        when (viewType) {
            HEADER_ITEM -> HeaderEventViewHolder(parent)
            NOW_EMPTY_EVENT -> NowEmptyEventViewHolder(parent)
            EVENT -> EventViewHolder(parent)
            COMPLETED_EVENT -> CompletedViewHolder(parent)
            else -> throw IllegalStateException("Holder is missing for this element")
        }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        when (holder) {
            is HeaderEventViewHolder -> holder.bind(getItem(position) as EventItem.HeaderEvent)
            is NowEmptyEventViewHolder -> holder.bind()
            is EventViewHolder ->
                holder.bind(
                    getItem(position) as EventItem.Event,
                    itemClickListener
                )
            is CompletedViewHolder ->
                holder.bind(
                    getItem(position) as EventItem.CompletedEvent,
                    itemClickListener
                )
        }
    }

    override fun getItemViewType(position: Int): Int =
        when (getItem(position)) {
            is EventItem.HeaderEvent -> HEADER_ITEM
            is EventItem.NowEmptyEvent -> NOW_EMPTY_EVENT
            is EventItem.Event -> EVENT
            is EventItem.CompletedEvent -> COMPLETED_EVENT
        }
}