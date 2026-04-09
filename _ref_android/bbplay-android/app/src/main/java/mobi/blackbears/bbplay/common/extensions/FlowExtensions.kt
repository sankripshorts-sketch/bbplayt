package mobi.blackbears.bbplay.common.extensions

import androidx.lifecycle.*
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.launch

fun <T> createMutableSingleEventFlow(): MutableSharedFlow<T> =
    MutableSharedFlow(0, 1, BufferOverflow.DROP_OLDEST)

fun <T> Flow<T>.observe(
    lifecycleOwner: LifecycleOwner,
    state: Lifecycle.State = Lifecycle.State.STARTED,
    observer: (T) -> Unit
) {
    lifecycleOwner.lifecycleScope.launch {
        lifecycleOwner.repeatOnLifecycle(state) {
            collect { value -> observer(value) }
        }
    }
}

fun ViewModel.launchOrError(
    action: suspend () -> Unit,
    error: (Exception) -> Unit
) {
    viewModelScope.launch {
        try {
            action.invoke()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            error.invoke(e)
        }
    }
}