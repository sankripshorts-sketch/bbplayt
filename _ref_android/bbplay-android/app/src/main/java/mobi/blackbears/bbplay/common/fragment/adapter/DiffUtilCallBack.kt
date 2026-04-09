package mobi.blackbears.bbplay.common.fragment.adapter

import androidx.recyclerview.widget.DiffUtil

/** General dif util callback for recycler items
 * @param T data class extents Item for adapter
 * @see Item
 * @see GeneralListAdapter */
class DiffUtilCallBack <T: Item> : DiffUtil.ItemCallback<T>() {

    override fun areItemsTheSame(oldItem: T, newItem: T): Boolean = oldItem == newItem

    override fun areContentsTheSame(oldItem: T, newItem: T): Boolean = oldItem.hashCode() == newItem.hashCode()
}