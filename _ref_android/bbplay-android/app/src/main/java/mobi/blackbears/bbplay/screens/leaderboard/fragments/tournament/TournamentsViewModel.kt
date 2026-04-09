package mobi.blackbears.bbplay.screens.leaderboard.fragments.tournament

import androidx.lifecycle.*
import mobi.blackbears.bbplay.common.extensions.createMutableSingleEventFlow
import mobi.blackbears.bbplay.common.navigation.NavCommand
import mobi.blackbears.bbplay.common.domain.model.GamesStates
import mobi.blackbears.bbplay.screens.leaderboard.domain.usecase.GetGamesUseCase
import mobi.blackbears.bbplay.screens.leaderboard.fragments.tournament.factory.GameItemFactory
import mobi.blackbears.bbplay.screens.leaderboard.fragments.tournament.model.GameItem
import mobi.blackbears.bbplay.screens.leaderboard.navigation.LeaderBoardRouter
import kotlinx.coroutines.flow.*
import mobi.blackbears.bbplay.common.data.model.BBError
import javax.inject.Inject

class TournamentsViewModel @Inject constructor(
    private val router: LeaderBoardRouter,
    getGamesUseCase: GetGamesUseCase,
    private val gameItemFactory: GameItemFactory
) : ViewModel() {
    private val _navCommand = createMutableSingleEventFlow<NavCommand>()
    val navCommand get() = _navCommand.asSharedFlow()

    private val _games = MutableStateFlow<List<GameItem>>(listOf())
    val games get() = _games.asStateFlow()

    private val _isLoaderVisible = MutableStateFlow(true)
    val isLoaderVisible get() = _isLoaderVisible.asStateFlow()

    private val _errorFlow = createMutableSingleEventFlow<BBError>()
    val errorFlow get() = _errorFlow.asSharedFlow()

    init {
        getGamesUseCase.invoke()
            .onEach {
                val gamesInfo = it.map { info -> gameItemFactory.createGameItem(info, ::navigateToLeaders) }
                _games.tryEmit(gamesInfo)
                _isLoaderVisible.tryEmit(false)
            }
            .catch {
                if (it is BBError) _errorFlow.tryEmit(it)
            }
            .launchIn(viewModelScope)
    }

    private fun navigateToLeaders(gameName: String) {
        val gameState = when(gameName) {
            GamesStates.CSGO.gameName -> GamesStates.CSGO
            GamesStates.LOL.gameName -> GamesStates.LOL
            GamesStates.DOTA.gameName -> GamesStates.DOTA
            GamesStates.VALORANT.gameName -> GamesStates.VALORANT
            GamesStates.FORTNITE.gameName -> GamesStates.FORTNITE
            else -> throw IllegalArgumentException("Game not added in enum or incorrect Argument")
        }
        navigateToLeadersFragment(gameState)
    }

    private fun navigateToLeadersFragment(gameState: GamesStates) {
        _navCommand.tryEmit(router.navigateToLeadersFragment(gameState))
    }
}