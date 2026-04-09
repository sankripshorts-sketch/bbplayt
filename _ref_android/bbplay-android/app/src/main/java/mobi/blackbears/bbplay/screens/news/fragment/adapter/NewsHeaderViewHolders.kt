package mobi.blackbears.bbplay.screens.news.fragment.adapter

import android.view.*
import android.view.animation.AnimationUtils
import androidx.core.view.isVisible
import androidx.recyclerview.widget.RecyclerView
import coil.api.load
import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.common.extensions.*
import mobi.blackbears.bbplay.databinding.*
import java.time.LocalDateTime
import java.time.format.*
import java.util.*

class NewsHeaderViewHolderLoading private constructor(
    private val binding: ItemNewsLoadingBinding
) : RecyclerView.ViewHolder(binding.root) {

    constructor(parent: ViewGroup) : this(
        ItemNewsLoadingBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    fun bind() {
        val anim = AnimationUtils.loadAnimation(binding.root.context, R.anim.alpha)
        with(binding) {
            viewLoading1.startAnimation(anim)
            viewLoading2.startAnimation(anim)
            viewLoading3.startAnimation(anim)
            viewLoading4.startAnimation(anim)
        }
    }
}

class NewsHeaderViewHolderSuccess private constructor(
    private var binding: ItemNewsBinding
) : RecyclerView.ViewHolder(binding.root) {

    constructor(parent: ViewGroup) : this(
        ItemNewsBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    fun bind(
        newsItem: NewsItem,
        onClickButton: (Long) -> Unit,
        onClickLinkButton: (String) -> Unit
    ) {
        setDate(newsItem.date)
        setText(newsItem.text)
        setImage(newsItem)
        setButtonsVisibleAndText(newsItem)
        setClickListeners(newsItem, onClickButton, onClickLinkButton)
    }

    private fun setDate(date: LocalDateTime) {
        val formatterHoursAndMin: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm")
        binding.tvNewsDate.text = binding.root.resources.getString(
            R.string.post_news_date,
            date.dayOfMonth,
            date.month.getDisplayName(TextStyle.SHORT, Locale.getDefault()),
            date.format(formatterHoursAndMin)
        )
    }

    private fun setText(postText: String) {
        with(binding.tvNewsDescription) {
            if (postText.isNotBlank()) {
                isVisible = true
                text = postText.cutLinkInfoFromText()
            } else
                isVisible = false
        }
    }

    private fun setImage(newsItem: NewsItem) {
        val photos = newsItem.photos
        val videos = newsItem.videos
        val ivNews = binding.ivNews

        if (videos.isEmpty() && photos.isEmpty()) {
            ivNews.isVisible = false
            binding.ivNewsPlay.isVisible = false
            return
        }

        ivNews.isVisible = true
        binding.ivNewsPlay.isVisible = videos.isNotEmpty()

        if (videos.isNotEmpty()) {
            ivNews.load(newsItem.videos.first().imageVideoUrl)
            return
        }
        ivNews.load(newsItem.photos.first().imageUrl)
    }

    private fun setButtonsVisibleAndText(newsItem: NewsItem) {
        with(binding.newsButtons) {
            btnNewsComments.text = newsItem.commentsCount.toString()
            btnNewsLink.isVisible = newsItem.link != null
            btnNewsPoll.isVisible = newsItem.poll != null
        }
        setVisibleButtonImage(newsItem)
    }

    private fun setVisibleButtonImage(newsItem: NewsItem) {
        val imagesCount = newsItem.imagesCount
        val btnNewsImages = binding.newsButtons.btnNewsImages

        if (imagesCount > 1) {
            btnNewsImages.isVisible = true
            btnNewsImages.text = imagesCount.toString()
        } else {
            btnNewsImages.isVisible = false
        }
    }

    private fun setClickListeners(
        newsItem: NewsItem,
        onClickButton: (Long) -> Unit,
        onClickLinkButton: (String) -> Unit
    ) {
        val postId = newsItem.postId

        binding.glHeaderNews.setBlockingClickListener {
            onClickButton.invoke(postId)
        }

        binding.ivNewsPlay.setBlockingClickListener {
            onClickButton(postId)
        }

        with(binding.newsButtons) {
            btnNewsComments.setBlockingClickListener {
                onClickButton.invoke(postId)
            }
            btnNewsImages.setBlockingClickListener {
                onClickButton.invoke(postId)
            }
            btnNewsPoll.setBlockingClickListener {
                onClickButton.invoke(postId)
            }
            btnNewsLink.setBlockingClickListener {
                onClickLinkButton.invoke(newsItem.link?.linkUrl ?: emptyString())
            }
        }
    }
}