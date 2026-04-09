package mobi.blackbears.bbplay.common.fragment.adapter

import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView

/** Adapter for recycler view
 * @param T data class extents Item for adapter
 * @param RVH - recycler view. view holder */
abstract class GeneralListAdapter <T: Item, RVH: RecyclerView.ViewHolder>
    : ListAdapter<T, RVH>(DiffUtilCallBack<T>())