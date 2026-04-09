package mobi.blackbears.bbplay.screens.news.fragment.adapter

import android.view.*
import androidx.recyclerview.widget.RecyclerView
import mobi.blackbears.bbplay.common.fragment.adapter.GeneralListAdapter

private const val LOADING_VIEW = 1
private const val CONTENT_VIEW = 0

class NewsListAdapter(
    private val onClickButton: (Long) -> Unit,
    private val onClickLinkButton: (String) -> Unit
) : GeneralListAdapter<NewsItem, RecyclerView.ViewHolder>() {
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        return if (viewType == LOADING_VIEW)
            NewsHeaderViewHolderLoading(parent)
        else
            NewsHeaderViewHolderSuccess(parent)
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        when(holder) {
            is NewsHeaderViewHolderLoading -> holder.bind()
            is NewsHeaderViewHolderSuccess ->
                holder.bind(newsItem = getItem(position), onClickButton, onClickLinkButton)
        }
    }

    override fun getItemViewType(position: Int): Int =
        if (getItem(position) == NewsItem.EMPTY) LOADING_VIEW else CONTENT_VIEW
}