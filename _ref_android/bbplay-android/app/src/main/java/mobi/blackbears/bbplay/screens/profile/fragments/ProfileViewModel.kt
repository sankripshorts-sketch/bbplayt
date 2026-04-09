package mobi.blackbears.bbplay.screens.profile.fragments

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import mobi.blackbears.bbplay.common.data.model.BBError
import mobi.blackbears.bbplay.common.extensions.createMutableSingleEventFlow
import mobi.blackbears.bbplay.common.navigation.NavCommand
import mobi.blackbears.bbplay.common.preferences.PreferenceManager
import mobi.blackbears.bbplay.screens.profile.domain.model.ProfileInfo
import mobi.blackbears.bbplay.screens.profile.domain.usecases.GetProfileInfoUseCase
import mobi.blackbears.bbplay.screens.profile.navigation.ProfileRouter
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import mobi.blackbears.bbplay.common.metrica.MetricManager
import timber.log.Timber
import java.net.UnknownHostException
import javax.inject.Inject

class ProfileViewModel @Inject constructor(
    private val preferences: PreferenceManager,
    private val router: ProfileRouter,
    private val getProfileInfoUseCase: GetProfileInfoUseCase,
    private val metricManager: MetricManager
) : ViewModel() {

    private val _profileInfo = MutableStateFlow(ProfileInfo.EMPTY)
    val profileInfo: StateFlow<ProfileInfo> get() = _profileInfo.asStateFlow()

    private val _navCommand = createMutableSingleEventFlow<NavCommand>()
    val navCommand get() = _navCommand.asSharedFlow()

    private val _messageFlow = createMutableSingleEventFlow<BBError>()
    val messageFlow = _messageFlow.asSharedFlow()

    private val _isLoaderVisible = MutableStateFlow(true)
    val isLoaderVisible get() = _isLoaderVisible.asStateFlow()

    private val _isBonusBannerVisible = MutableStateFlow(false)
    val isBonusBannerVisible = combine(
        _isBonusBannerVisible,
        _isLoaderVisible.map(Boolean::not),
        Boolean::and
    ).stateIn(viewModelScope, SharingStarted.Lazily, false)

    init {
        loadProfileInfo()
    }

    fun loadProfileInfo() {
        showLoader(true)
        viewModelScope.launch {
            try {
                val member = getProfileInfoUseCase.invoke(preferences.getUserData().first().userId)
                _profileInfo.tryEmit(member)
                _isBonusBannerVisible.tryEmit(member.memberIsFirstSbpPayment)
                showLoader(false)
            } catch (error: CancellationException) {
                throw error
            } catch (error: BBError) {
                _messageFlow.tryEmit(error)
            } catch (e: UnknownHostException) {
                _messageFlow.tryEmit(BBError.NO_INTERNET)
            } catch (e: Exception) {
                Timber.e(e)
            }
        }
    }

    fun navigateToSettings() {
        _navCommand.tryEmit(router.navigateToSettingsFragment())
    }

    fun navigateToLeaderBoard() {
        _navCommand.tryEmit(router.navigateToLeaderBoardScreen())
    }

    fun navigateToPay() {
        if (profileInfo.value.memberEmail.isNullOrEmpty()) {
            _navCommand.tryEmit(router.navigateToConfirmUserEmailFragment())
        } else {
            val userInfo = profileInfo.value
            metricManager.payReplenishInProfile(userInfo.memberId, userInfo.memberAccount)
            _navCommand.tryEmit(router.navigateToPay(userInfo.memberPhone))
        }
    }

    fun navigateToBonusDialog() {
        _navCommand.tryEmit(router.navigateToBonusDialog())
    }

    private fun showLoader(isShow: Boolean) {
        _isLoaderVisible.tryEmit(isShow)
    }
}