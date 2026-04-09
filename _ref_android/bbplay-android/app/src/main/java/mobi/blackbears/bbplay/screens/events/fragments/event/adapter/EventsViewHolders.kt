package mobi.blackbears.bbplay.screens.events.fragments.event.adapter

import android.view.*
import androidx.core.view.isVisible
import androidx.recyclerview.widget.RecyclerView
import coil.api.load
import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.common.extensions.getStringFormatByStartAndEndDate
import mobi.blackbears.bbplay.common.extensions.setBlockingClickListener
import mobi.blackbears.bbplay.databinding.*
import mobi.blackbears.bbplay.screens.events.fragments.event.model.EventItem

class NowEmptyEventViewHolder private constructor(
    binding: ItemEmptyEventBinding
) : RecyclerView.ViewHolder(binding.root) {

    constructor(parent: ViewGroup) : this(
        ItemEmptyEventBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    fun bind() {}
}

class EventViewHolder private constructor(
    private val binding: ItemEventBinding,
) : RecyclerView.ViewHolder(binding.root) {

    constructor(parent: ViewGroup) : this(
        ItemEventBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    fun bind(event: EventItem.Event, itemClickListener: (String) -> Unit) {
        setImage(event)
        setTitle(event)
        setTimeEvent(event)
        binding.ivParticipant.isVisible = event.isParticipant
        binding.root.setBlockingClickListener {
            itemClickListener.invoke(event.eventId)
        }
    }

    private fun setImage(event: EventItem.Event) {
        binding.ivGameEvent.load(event.imageRes)
    }

    private fun setTitle(event: EventItem.Event) {
        with(binding) {
            tvTitleGameEvent.text =
                root.resources.getString(R.string.event_by_format_text, event.name.replace(",", ", "))
        }
    }

    private fun setTimeEvent(event: EventItem.Event) {
        with(binding) {
            tvDescriptionEvent.setTextColor(
                root.resources.getColor(event.textColorRes, root.context.theme)
            )

            val text = if (event.isActive)
                getStringFormatByStartAndEndDate(event.startDate, event.endDate)
            else
                root.context.getString(R.string.event_finished)
            tvDescriptionEvent.text = text
        }
    }
}

class CompletedViewHolder private constructor(
    private val binding: ItemEventBinding,
) : RecyclerView.ViewHolder(binding.root) {

    constructor(parent: ViewGroup) : this(
        ItemEventBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    fun bind(event: EventItem.CompletedEvent, itemClickListener: (String) -> Unit) {
        setImage(event)
        setTitle(event)
        setTimeEvent(event)
        binding.root.setBlockingClickListener {
            itemClickListener.invoke(event.eventId)
        }
    }

    private fun setImage(event: EventItem.CompletedEvent) {
        with(binding) {
            ivGameEvent.load(event.imageRes)
            ivGameEvent.alpha = event.alpha
        }
    }

    private fun setTitle(event: EventItem.CompletedEvent) {
        with(binding) {
            tvTitleGameEvent.text =
                root.resources.getString(R.string.event_by_format_text, event.name.replace(",", ", "))
            tvTitleGameEvent.alpha = event.alpha
        }
    }

    private fun setTimeEvent(event: EventItem.CompletedEvent) {
        with(binding) {
            tvDescriptionEvent.setTextColor(
                root.resources.getColor(event.textColorRes, root.context.theme)
            )
            tvDescriptionEvent.text = root.context.getString(R.string.event_finished)
        }
    }
}