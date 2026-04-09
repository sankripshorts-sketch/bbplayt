package mobi.blackbears.bbplay.screens.leaderboard.fragments.leaders

import androidx.lifecycle.*
import mobi.blackbears.bbplay.common.extensions.*
import mobi.blackbears.bbplay.common.navigation.NavCommand
import mobi.blackbears.bbplay.screens.leaderboard.domain.model.rank.RankInfo
import mobi.blackbears.bbplay.screens.leaderboard.domain.usecase.GetGamesUseCase
import mobi.blackbears.bbplay.screens.leaderboard.fragments.leaders.factory.SortingFactory
import mobi.blackbears.bbplay.screens.leaderboard.fragments.leaders.model.LeaderItem
import mobi.blackbears.bbplay.screens.leaderboard.navigation.LeaderBoardRouter
import kotlinx.coroutines.flow.*
import mobi.blackbears.bbplay.common.domain.model.GamesStates
import timber.log.Timber
import javax.inject.Inject

class LeadersViewModel @Inject constructor(
    private val getGamesUseCase: GetGamesUseCase,
    private val router: LeaderBoardRouter,
    private val sortingFactory: SortingFactory
) : ViewModel() {

    private val _titleGame = MutableStateFlow(emptyString())
    val titleGame get() = _titleGame.asStateFlow()

    private val _sortingName = MutableStateFlow(0)
    val sortingName get() = _sortingName.asStateFlow()

    private val _rankedItems = MutableStateFlow<List<LeaderItem>>(listOf())
    val rankedItems get() = _rankedItems.asStateFlow()

    private val _navCommand = createMutableSingleEventFlow<NavCommand>()
    val navCommand get() = _navCommand.asSharedFlow()

    //region StatisticDialogFragment
    private val _optionsSortFlow = MutableStateFlow<Array<Int>>(arrayOf())
    val optionsSortFlow = _optionsSortFlow.asStateFlow()

    private val _pickerCurrentValue = MutableStateFlow(0)
    val pickerCurrentValue get() = _pickerCurrentValue.asStateFlow()
    //endregion

    private var rankedList: List<RankInfo> = listOf()

    fun getGame(gamesState: GamesStates) {
        getGamesUseCase.getGame(gamesState)
            .onEach { rankedList = it }
            .onEach { setTitleGame(it.firstOrNull()) }
            .onEach { addSortOptions(it) }
            .onEach { setSortingItems(it, 0) }
            .catch { Timber.e(it) }
            .launchIn(viewModelScope)
    }

    private fun setTitleGame(rankInfo: RankInfo?) {
        _titleGame.tryEmit(rankInfo?.titleGame ?: emptyString())
    }

    private fun addSortOptions(ranks: List<RankInfo>) {
        val options = ranks.firstOrNull()?.getSortOptionsArray() ?: arrayOf()
        _optionsSortFlow.tryEmit(options)
    }

    private fun setSortingItems(rankedList: List<RankInfo>, value: Int) {
        val items = sortingFactory.sortingByValuePicker(rankedList, value)
        _rankedItems.tryEmit(items)
        _pickerCurrentValue.tryEmit(value)
        setNameSortInHeader(items.firstOrNull())
    }

    private fun setNameSortInHeader(leaderItem: LeaderItem?) {
        _sortingName.tryEmit(leaderItem?.sortNameResource ?: 0)
    }

    fun onSortClicked(value: Int): Unit = setSortingItems(rankedList, value)

    fun navigateToSorting() {
        _navCommand.tryEmit(router.navigateToDialogFragment())
    }
}