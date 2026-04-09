package mobi.blackbears.bbplay.screens.events.fragments.event.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import mobi.blackbears.bbplay.databinding.ItemHeaderEventNameBinding
import mobi.blackbears.bbplay.screens.events.fragments.event.model.EventItem

class HeaderEventViewHolder private constructor(
    private val binding: ItemHeaderEventNameBinding,
) : RecyclerView.ViewHolder(binding.root) {

    constructor(parent: ViewGroup) : this(
        ItemHeaderEventNameBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    fun bind(event: EventItem.HeaderEvent) {
        with(binding.root) {
            setTextColor(resources.getColor(event.textColorRes, context.theme))
            text = resources.getText(event.textRes)
        }
    }
}