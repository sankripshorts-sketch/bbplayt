package mobi.blackbears.bbplay.screens.leaderboard.fragments.leaders.adapter

import android.content.res.ColorStateList
import androidx.recyclerview.widget.RecyclerView
import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.databinding.ItemRankBinding
import mobi.blackbears.bbplay.screens.leaderboard.fragments.leaders.model.LeaderItem

class LeaderViewHolder(private val binding: ItemRankBinding) : RecyclerView.ViewHolder(binding.root) {

    fun bind(item: LeaderItem, rankNumber: Int) {
        setColorBackGround(rankNumber)
        with(binding) {
            tvRankNumber.text = rankNumber.toString()
            tvRankPlayerName.text = item.playerName
            tvRankDescription.text = item.value
        }
    }

    private fun setColorBackGround(number: Int) {
        with(binding) {
            cvRankOne.backgroundTintList = getColorByPlace(number)
            cvRankTwo.backgroundTintList = getColorByPlace(number)
            cvRankThree.backgroundTintList = getColorByPlace(number)
        }
    }

    private fun getColorByPlace(number: Int): ColorStateList {
        with(binding.root.resources) {
            val color = when(number){
                1 -> getColor(R.color.gold, newTheme())
                2 -> getColor(R.color.silver, newTheme())
                3 -> getColor(R.color.bronze, newTheme())
                else -> getColor(R.color.grey_dark, newTheme())
            }
            return ColorStateList.valueOf(color)
        }
    }
}