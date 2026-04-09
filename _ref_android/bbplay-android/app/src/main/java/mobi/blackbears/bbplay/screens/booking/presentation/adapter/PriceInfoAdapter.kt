package mobi.blackbears.bbplay.screens.booking.presentation.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import mobi.blackbears.bbplay.common.fragment.adapter.GeneralListAdapter
import mobi.blackbears.bbplay.databinding.*
import javax.inject.Inject

private const val HEADER_ONE = 1
private const val HEADER_TWO = 2
private const val NIGHT_PACKAGE_POSITION = 3

class PriceInfoAdapter @Inject constructor() :
    GeneralListAdapter<PriceItem, RecyclerView.ViewHolder>() {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        return if (viewType == HEADER_ONE) {
            val view = ItemPriceOneBinding.inflate(LayoutInflater.from(parent.context))
            PriceHeaderOneHolder(view)
        } else{
            val view = ItemPriceTwoBinding.inflate(LayoutInflater.from(parent.context))
            PriceHeaderTwoHolder(view)
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        when(holder) {
            is PriceHeaderOneHolder -> holder.bind(getItem(position))
            is PriceHeaderTwoHolder -> holder.bind(getItem(position))
        }
    }

    override fun getItemViewType(position: Int): Int =
        if (position == NIGHT_PACKAGE_POSITION)
            HEADER_TWO
        else
            HEADER_ONE
}