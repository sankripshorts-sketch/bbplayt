package mobi.blackbears.bbplay.common.activity

import androidx.lifecycle.*
import kotlinx.coroutines.flow.*
import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.common.activity.navigation.BottomItem
import mobi.blackbears.bbplay.common.activity.navigation.BottomNavigationRouter
import mobi.blackbears.bbplay.common.data.model.BBError
import mobi.blackbears.bbplay.common.domain.usecases.CheckUserExistsOrActiveUseCase
import mobi.blackbears.bbplay.common.extensions.createMutableSingleEventFlow
import mobi.blackbears.bbplay.common.navigation.NavCommand
import mobi.blackbears.bbplay.common.preferences.PreferenceManager
import mobi.blackbears.bbplay.common.preferences.UserData
import timber.log.Timber
import java.net.UnknownHostException
import javax.inject.Inject

class MainViewModel @Inject constructor(
    private val preferences: PreferenceManager,
    private val checkUserUseCase: CheckUserExistsOrActiveUseCase,
    private val router: BottomNavigationRouter
): ViewModel() {
    private var userId = UserData.NONE_ID

    private val _navCommand = createMutableSingleEventFlow<NavCommand>()
    val navCommand get() = _navCommand.asSharedFlow()

    private val _errorFlow = createMutableSingleEventFlow<BBError>()
    val errorFlow get() = _errorFlow.asSharedFlow()

    private val _logoutToastMessage = createMutableSingleEventFlow<Int>()
    val logoutToastMessage = _logoutToastMessage.asSharedFlow()

    /**
     * Тянет userId из data store preferences. Если userId -1, следовательно user не залогинен.
     * Если есть, проверяем, существует ли пользователь еще в системе, если нет - разлогиниваем,
     * если да - даем войти.
     */
    val checkUserId = preferences.getUserData()
        .onEach {  checkPrivateKeyUser(it.nickname, it.userPrivateKey)  }
        .map(::mapToUserId)
        .onEach { userId = it }
        .catch {
            if (it is UnknownHostException) _errorFlow.tryEmit(BBError.NO_INTERNET)
        }
        .shareIn(viewModelScope, SharingStarted.Lazily)

    /*В версии 1.2 появились события, и чтобы забрать награду нужно отправлять приватный ключ.
      Приватный ключ добавил бэкенд медведей, и он будет получен при логине или регистрации.
      Но у нас есть люди которые уже залогинены в версии 1.1, и когда они обновят приложение
      они не смогут получать награды т.к у них нет приватного ключа. Для этого нам придется проверять
      на наличие приватного ключа и если его нет разлогинивать пользователя.
     */
    private suspend fun checkPrivateKeyUser(nickname: String, privateKey: String) {
        if (nickname.isNotEmpty() && privateKey.isEmpty()) {
            preferences.setUserData(UserData.NONE)
            _logoutToastMessage.tryEmit(R.string.logout_text_message)
        }
    }

    private suspend fun mapToUserId(userData: UserData): Long =
        if (userData == UserData.NONE) userData.userId else checkUserFromNetwork(userData.userId)

    private suspend fun checkUserFromNetwork(userId: Long): Long =
        try {
            checkUserUseCase.invoke(userId)
        } catch (e: BBError) {
            Timber.e(e)
            _errorFlow.tryEmit(e)
            preferences.setUserData(UserData.NONE)
            UserData.NONE_ID
        } catch (e: UnknownHostException) {
            throw e
        }

    fun navigateToItem(itemMenu: BottomItem) {
        val navCommand = when (itemMenu) {
            is BottomItem.ProfileOrLogin -> router.navigateToProfileOrLogin(userId, itemMenu.options)
            is BottomItem.News -> router.navigateToNews(itemMenu.options)
            is BottomItem.Clubs -> router.navigateToClubs(itemMenu.options)
            is BottomItem.Events -> router.navigateToEvents(itemMenu.options)
            is BottomItem.Booking -> router.navigateToBooking(itemMenu.options)
        }
        _navCommand.tryEmit(navCommand)
    }
}