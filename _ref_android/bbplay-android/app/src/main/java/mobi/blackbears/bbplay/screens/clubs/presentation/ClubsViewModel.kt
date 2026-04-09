package mobi.blackbears.bbplay.screens.clubs.presentation

import android.content.Intent
import android.net.Uri
import androidx.lifecycle.*
import mobi.blackbears.bbplay.common.data.model.BBError
import mobi.blackbears.bbplay.common.extensions.createMutableSingleEventFlow
import mobi.blackbears.bbplay.common.navigation.NavCommand
import mobi.blackbears.bbplay.screens.clubs.domain.model.ClubInfo
import mobi.blackbears.bbplay.screens.clubs.domain.usecases.GetClubInfoUseCase
import mobi.blackbears.bbplay.screens.clubs.navigation.ClubsRouter
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import timber.log.Timber
import java.net.UnknownHostException
import javax.inject.Inject

class ClubsViewModel @Inject constructor(
    private val router: ClubsRouter,
    private val getClubInfoUseCase: GetClubInfoUseCase
) : ViewModel() {
    private val _navCommand = createMutableSingleEventFlow<NavCommand>()
    val navCommand get() = _navCommand.asSharedFlow()

    private val _clubsInfo = MutableStateFlow<List<ClubInfo>>(listOf())
    val clubsInfo get() = _clubsInfo.asStateFlow()

    private val _intentFlow = createMutableSingleEventFlow<Intent>()
    val intentFlow get() = _intentFlow.asSharedFlow()

    private val _isLoaderVisible = MutableStateFlow(true)
    val isLoaderVisible get() = _isLoaderVisible.asStateFlow()

    private val _message = createMutableSingleEventFlow<BBError>()
    val message = _message.asSharedFlow()

    init {
        getClubsInfo()
    }

    private fun getClubsInfo() = viewModelScope.launch {
        try {
            val clubs = getClubInfoUseCase.getClubsInfo()
            _clubsInfo.tryEmit(clubs)
            _isLoaderVisible.tryEmit(false)
        } catch (error: CancellationException) {
            throw error
        } catch (error: BBError) {
            _message.tryEmit(error)
        } catch (e: UnknownHostException) {
            _message.tryEmit(BBError.NO_INTERNET)
        } catch (error: Exception) {
            Timber.e(error)
        }
    }

    fun onClickLocation(lat: Double, lng: Double) {
        val uri = "geo:$lat,$lng?q=$lat,$lng"
        createIntent(uri)
    }

    fun onClickOpenVkGroup(websiteUrl: String) {
        val uri = "https://${websiteUrl}"
        createIntent(uri)
    }

    fun onClickOpenPhone(phone: String) {
        try {
            val intent = Intent(Intent.ACTION_DIAL,  Uri.fromParts("tel", phone, null))
            _intentFlow.tryEmit(intent)
        } catch (e: Exception) {
            _message.tryEmit(BBError("", "Error open"))
        }
    }

    private fun createIntent(intentUri: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(intentUri))
            _intentFlow.tryEmit(intent)
        } catch (e: Exception) {
            _message.tryEmit(BBError("", "Error open"))
        }
    }

    fun navigateToJobReviewDialog() {
        _navCommand.tryEmit(router.navigateToJobReviewDialog())
    }
}