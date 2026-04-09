package mobi.blackbears.bbplay.screens.events.fragments.event.factory

import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.common.domain.model.GamesStates
import mobi.blackbears.bbplay.screens.events.domain.model.EventDetail
import mobi.blackbears.bbplay.screens.events.domain.model.EventStatusType
import mobi.blackbears.bbplay.screens.events.domain.model.EventWithMembersAndReward
import mobi.blackbears.bbplay.screens.events.fragments.event.model.EventItem

class CreateEventItemsFactory {
    fun createEventItems(events: List<EventWithMembersAndReward>): List<EventItem> {
        val items = arrayListOf<EventItem>()

        val rewardEvents = arrayListOf<EventWithMembersAndReward>()
        val completedEvents = arrayListOf<EventWithMembersAndReward>()
        val activeEvents = arrayListOf<EventWithMembersAndReward>()

        events
            .filter { it.event.eventStatus != EventStatusType.UPCOMING }
            .forEach {
                if (it.event.eventStatus == EventStatusType.ACTIVE) {
                    activeEvents.add(it)
                    return@forEach
                }
                if (it.event.eventStatus == EventStatusType.NOT_ACTIVE && it.isHaveReward) {
                    rewardEvents.add(it)
                    return@forEach
                }
                completedEvents.add(it)
            }
        addRewardItems(items, rewardEvents)
        addActiveItems(items, activeEvents)
        addCompletedItems(items, completedEvents)
        return items
    }

    private fun addRewardItems(
        items: MutableList<EventItem>,
        rewardEvents: List<EventWithMembersAndReward>,
    ) {
        if (rewardEvents.isNotEmpty()) {
            items.add(EventItem.HeaderEvent(R.string.header_reward_text, R.color.green))
            items.addAll(rewardEvents.map {
                mapToEvent(
                    it.event,
                    it.isParticipant,
                    R.color.red_event_end
                )
            })
        }
    }

    private fun addActiveItems(
        items: MutableList<EventItem>,
        activeEvents: List<EventWithMembersAndReward>,
    ) {
        items.add(EventItem.HeaderEvent(R.string.header_active_event, R.color.white))
        if (activeEvents.isEmpty())
            items.add(EventItem.NowEmptyEvent)
        else
            items.addAll(activeEvents.map {
                mapToEvent(
                    it.event,
                    it.isParticipant,
                    R.color.green_light_success
                )
            })
    }

    private fun mapToEvent(
        event: EventDetail,
        isParticipant: Boolean,
        textColorRes: Int
    ): EventItem.Event = event.run {
        EventItem.Event(
            eventId = eventId,
            name = gameName,
            imageRes = GamesStates.values()
                .find { it.gameName == eventGameCode }?.imageItem ?: GamesStates.ALL.imageItem,
            startDate = eventStartTimeShow,
            endDate = eventEndTimeShow,
            textColorRes = textColorRes,
            isActive = event.eventStatus == EventStatusType.ACTIVE,
            isParticipant = isParticipant
        )
    }

    private fun addCompletedItems(
        items: MutableList<EventItem>,
        completed: List<EventWithMembersAndReward>,
    ) {
        if (completed.isNotEmpty()) {
            items.add(EventItem.HeaderEvent(R.string.header_completed_event, R.color.grey_900))
            items.addAll(completed.map { mapToCompletedEvent(it.event) })
        }
    }

    private fun mapToCompletedEvent(event: EventDetail): EventItem.CompletedEvent = event.run {
        EventItem.CompletedEvent(
            eventId = eventId,
            name = gameName,
            imageRes = GamesStates.values()
                .find { it.gameName == eventGameCode }?.imageItem ?: GamesStates.ALL.imageItem,
            startDate = eventStartTimeShow,
            endDate = eventEndTimeShow,
            alpha = 0.4f,
            textColorRes = R.color.red_event_end
        )
    }
}