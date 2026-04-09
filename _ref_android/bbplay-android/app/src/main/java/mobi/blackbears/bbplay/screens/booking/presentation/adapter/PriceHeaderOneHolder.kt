package mobi.blackbears.bbplay.screens.booking.presentation.adapter

import androidx.recyclerview.widget.RecyclerView
import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.common.extensions.castToDouble
import mobi.blackbears.bbplay.databinding.*

class PriceHeaderOneHolder(val binding: ItemPriceOneBinding) : RecyclerView.ViewHolder(binding.root) {
    fun bind(item: PriceItem) {
        with(binding) {
            tvName.text = root.context.getString(item.resId)
            val gameZonePrice = item.gameZone.productPrice.castToDouble().toInt()
            val bootCampPrice = item.bootCamp.productPrice.castToDouble().toInt()

            if (gameZonePrice != 0 && bootCampPrice != 0) {
                gameZone.text = root.context.getString(R.string.show_balance, gameZonePrice)
                bootCamp.text = root.context.getString(R.string.show_balance, bootCampPrice)
            }
        }
    }
}

class PriceHeaderTwoHolder(val binding: ItemPriceTwoBinding) : RecyclerView.ViewHolder(binding.root) {
    fun bind(item: PriceItem) {
        with(binding) {

            val timeText = if (item.resId == R.string.morning_text)
                root.resources.getString(R.string.morning_time_text)
            else
                root.resources.getString(R.string.night_time_text)

            tvNamePrice.text = root.context.getString(item.resId)
            tvTimePrice.text = timeText
            val gameZonePrice = item.gameZone.productPrice.castToDouble().toInt()
            val bootCampPrice = item.bootCamp.productPrice.castToDouble().toInt()

            if (gameZonePrice != 0 && bootCampPrice != 0) {
                gameZone.text = root.context.getString(R.string.show_balance, gameZonePrice)
                bootCamp.text = root.context.getString(R.string.show_balance, bootCampPrice)
            }
        }
    }
}