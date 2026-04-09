package mobi.blackbears.bbplay.screens.news.fragment

import android.content.Intent
import android.net.Uri
import androidx.lifecycle.*
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import mobi.blackbears.bbplay.BuildConfig
import mobi.blackbears.bbplay.common.extensions.createMutableSingleEventFlow
import mobi.blackbears.bbplay.screens.news.domain.usecases.*
import mobi.blackbears.bbplay.screens.news.fragment.adapter.NewsItem
import timber.log.Timber
import javax.inject.Inject

private const val VK_URL_POST = "https://vk.com/bbplay_tmb?w=wall"
private const val SEPARATOR = "_"

class NewsViewModel @Inject constructor(
    private val getNewsUseCase: GetNewsUseCase,
    private val createNewsItemsUseCase: CreateNewsItemsUseCase
) : ViewModel() {
    private val loadingNews = List(10) { NewsItem.EMPTY }
    private val _newsFlow = MutableStateFlow(loadingNews)
    val newsFlow get() = _newsFlow.asStateFlow()

    private val _isCanScroll = MutableStateFlow(false)
    val isCanScroll get() = _isCanScroll.asStateFlow()

    private val _intent = createMutableSingleEventFlow<Intent>()
    val intent get() = _intent.asSharedFlow()

    init {
        viewModelScope.launch {
            try {
                val vkNewsInWall = getNewsUseCase.getNews()
                val newsItems = createNewsItemsUseCase.createNewsItems(vkNewsInWall)
                _newsFlow.tryEmit(newsItems)
                _isCanScroll.tryEmit(true)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {

                Timber.e(e)
            }
        }
    }

    fun clickButtonInNews(postId: Long) {
        val urlVk = "$VK_URL_POST${BuildConfig.VK_COMMUNITY_ID}$SEPARATOR$postId"
        createAndEmitIntent(urlVk)
    }

    fun clickButtonLinkInNews(linkUrl: String) {
        createAndEmitIntent(linkUrl)
    }

    private fun createAndEmitIntent(url: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            _intent.tryEmit(intent)
        } catch (e: Exception) {
            Timber.e(e)
        }
    }
}