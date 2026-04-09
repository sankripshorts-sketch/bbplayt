package mobi.blackbears.bbplay.screens.events.fragments.detail_event

import androidx.lifecycle.*
import kotlinx.coroutines.flow.*
import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.common.domain.model.GamesStates
import mobi.blackbears.bbplay.common.extensions.*
import mobi.blackbears.bbplay.common.navigation.NavCommand
import mobi.blackbears.bbplay.common.preferences.*
import mobi.blackbears.bbplay.screens.events.domain.model.*
import mobi.blackbears.bbplay.screens.events.domain.usecases.GetEventUseCase
import mobi.blackbears.bbplay.screens.events.fragments.detail_event.adapter.DetailEventItem
import mobi.blackbears.bbplay.screens.events.fragments.detail_event.decorator.PlaceNotWinner
import mobi.blackbears.bbplay.screens.events.fragments.detail_event.decorator.ResourceStringDecorator
import mobi.blackbears.bbplay.screens.events.fragments.detail_event.decorator.TopWinner
import mobi.blackbears.bbplay.screens.events.navigation.EventRouter
import timber.log.Timber
import java.time.LocalDateTime
import javax.inject.Inject

class DetailEventViewModel @Inject constructor(
    private val getEventUseCase: GetEventUseCase,
    private val router: EventRouter,
    preferenceManager: PreferenceManager
) : ViewModel() {
    private val _isLoaderVisible = MutableStateFlow(1.0f)
    val isLoaderVisible get() = _isLoaderVisible.asStateFlow()

    private val _imageRes = MutableStateFlow(-1)
    val imageRes get() = _imageRes.asStateFlow()

    private val _titleEvent = MutableStateFlow(emptyString())
    val titleEvent get() = _titleEvent.asStateFlow()

    private val _isActiveEvent = MutableStateFlow(false)
    val isActiveEvent get() = _isActiveEvent.asStateFlow()

    private val _timeEvent = MutableStateFlow(LocalDateTime.MIN to LocalDateTime.MIN)
    val timeEvent get() = _timeEvent.asStateFlow()

    private val _eventDescription = MutableStateFlow(emptyString())
    val eventDescription get() = _eventDescription.asStateFlow()

    private val _membersOfEvent = MutableStateFlow<List<DetailEventItem>>(listOf())
    val membersOfEvent get() = _membersOfEvent.asStateFlow()

    private val _isVisibleJoinEventButton = MutableStateFlow(true)
    val isVisibleJoinEventButton get() = _isVisibleJoinEventButton.asStateFlow()

    private val _textResOnButton = MutableStateFlow<ResourceStringDecorator>(PlaceNotWinner(5))
    val textResOnButton get() = _textResOnButton.asStateFlow()

    private val _isRewardEnabled = MutableStateFlow(false)
    val isRewardEnabled = _isRewardEnabled.asStateFlow()

    private val _navCommand = createMutableSingleEventFlow<NavCommand>()
    val navCommand get() = _navCommand.asSharedFlow()

    private val _messageFlow = createMutableSingleEventFlow<Int>()
    val messageFlow get() = _messageFlow.asSharedFlow()

    private val userData = preferenceManager.getUserData()
        .stateIn(viewModelScope, SharingStarted.Eagerly, UserData.NONE)
        .value
    private var eventId: String = emptyString()

    fun getDetailEventById(eventId: String) {
        this.eventId = eventId
        getDetailEvent()
    }

    fun getDetailEvent() {
        if (eventId.isEmpty()) return
        emitLoading(1.0f)
        launchOrError(
            {
                val eventDetail = getEventUseCase.getDetailsEvent(eventId)
                val event = eventDetail.event
                _titleEvent.tryEmit(event.gameName)
                _eventDescription.tryEmit(event.eventDescription)
                emitImageRes(event)
                emitTimeEventAndStatus(event)
                emitMembers(eventDetail.members)
                emitIsVisibleJoinEventButton(eventDetail.members)
                addRewardButtonState(eventDetail)
                emitLoading(0.0f)
            },
            { Timber.e(it) }
        )
    }

    private fun emitLoading(value: Float) {
        _isLoaderVisible.tryEmit(value)
    }

    private fun emitImageRes(event: EventDetail) {
        val image = GamesStates.values().find { it.gameName == event.eventGameCode }?.imageHeader
            ?: GamesStates.ALL.imageHeader
        _imageRes.tryEmit(image)
    }

    private fun emitTimeEventAndStatus(event: EventDetail) {
        if (event.eventStatus == EventStatusType.ACTIVE) _isActiveEvent.tryEmit(true)
        _timeEvent.tryEmit(event.eventStartTimeShow to event.eventEndTimeShow)
    }

    private fun emitMembers(members: List<MemberOfEvent>) {
        val memberItems = members.map {
            val backgroundColor = getColorByPositionAndNick(it)
            val textColor =
                if (backgroundColor == R.color.green_light_success)
                    R.color.background
                else
                    R.color.white
            DetailEventItem(backgroundColor, textColor, it)
        }
        _membersOfEvent.tryEmit(memberItems)
    }

    private fun getColorByPositionAndNick(member: MemberOfEvent): Int {
        if (userData == UserData.NONE) return getColorsForPrizesPlaces(member)
        if (member.memberAccount == userData.nickname) return R.color.green_light_success
        return getColorsForPrizesPlaces(member)
    }

    private fun getColorsForPrizesPlaces(member: MemberOfEvent): Int = when (member.memberRank) {
        1L -> R.color.gold
        2L -> R.color.silver
        3L -> R.color.bronze
        else -> R.color.grey_dark
    }

    private fun emitIsVisibleJoinEventButton(members: List<MemberOfEvent>) {
        val member = members.find { it.memberAccount == userData.nickname }
        _isVisibleJoinEventButton.tryEmit(member == null)
    }

    private suspend fun addRewardButtonState(eventOfClub: EventOfClub) {
        if (isVisibleJoinEventButton.value) return
        val member = eventOfClub.members.find { it.memberAccount == userData.nickname } ?: return
        if (eventOfClub.event.eventStatus == EventStatusType.ACTIVE) {
            emitEnabledRewardButton(false)
            emitTextResOnButton(PlaceNotWinner(member.memberRank.toInt()))
            return
        }
        val eventId = eventOfClub.event.eventId
        when (val rank = member.memberRank) {
            1L -> emitRewardState(rank, eventId, FIRST_PLACE_REWARD_AMOUNT)
            2L -> emitRewardState(rank, eventId, SECOND_PLACE_REWARD_AMOUNT)
            3L -> emitRewardState(rank, eventId, THIRD_PLACE_REWARD_AMOUNT)
            else -> {
                emitEnabledRewardButton(false)
                emitTextResOnButton(PlaceNotWinner(rank.toInt()))
            }
        }
    }

    private suspend fun emitRewardState(rank: Long, eventId: String, rewardAmount: Int) {
        val rewardEnabled = getEventUseCase.isHaveReward(userData.userId, eventId)
        emitEnabledRewardButton(rewardEnabled)
        emitTextResOnButton(TopWinner(rank.toInt(), rewardAmount, rewardEnabled))
    }

    private fun emitEnabledRewardButton(isEnabled: Boolean) {
        _isRewardEnabled.tryEmit(isEnabled)
    }

    private fun emitTextResOnButton(res: ResourceStringDecorator) {
        _textResOnButton.tryEmit(res)
    }

    fun navigateToJoinEventBottomFragment() {
        _navCommand.tryEmit(router.navigateToJoinEventBottomFragment())
    }

    fun onGetRewardClick() {
        launchOrError(
            {
                val rewardAmount = getRewardAmountByPlace()
                if (rewardAmount == null) {
                    _messageFlow.tryEmit(R.string.wrong_text)
                    return@launchOrError
                }
                val isGetReward = getEventUseCase.getReward(
                    userData.userId,
                    eventId,
                    userData.userPrivateKey,
                    rewardAmount
                )
                _messageFlow.tryEmit(getResourceByReward(isGetReward))
                emitEnabledRewardButton(false)
            },
            {
                Timber.e(it)
                _messageFlow.tryEmit(R.string.wrong_text)
            }
        )
    }

    private fun getRewardAmountByPlace(): Int? {
        val member = membersOfEvent.value.find { it.member.memberAccount == userData.nickname }
                ?: return null
        return when (member.member.memberRank) {
            1L -> FIRST_PLACE_REWARD_AMOUNT
            2L -> SECOND_PLACE_REWARD_AMOUNT
            3L -> THIRD_PLACE_REWARD_AMOUNT
            else -> null
        }
    }

    private fun getResourceByReward(isGetReward: Boolean): Int =
        if (isGetReward) R.string.reward_received else R.string.reward_already_received_text

}