package mobi.blackbears.bbplay.screens.events.fragments.detail_event.adapter

import android.content.res.ColorStateList
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import mobi.blackbears.bbplay.databinding.ItemRankBinding

class DetailEventlViewHolder private constructor(
    private val binding: ItemRankBinding,
) : RecyclerView.ViewHolder(binding.root) {

    constructor(parent: ViewGroup) : this(
        ItemRankBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    fun bind(item: DetailEventItem) {
        setColor(item.colorBackgroundRes, item.colorText)
        setText(item)
    }

    private fun setColor(backgroundColor: Int, textColor: Int) {
        with(binding) {
            val context = root.context
            val resources = root.resources
            cvRankOne.backgroundTintList =
                ColorStateList.valueOf(resources.getColor(backgroundColor, context.theme))
            cvRankTwo.backgroundTintList =
                ColorStateList.valueOf(resources.getColor(backgroundColor, context.theme))
            cvRankThree.backgroundTintList =
                ColorStateList.valueOf(resources.getColor(backgroundColor, context.theme))
            tvRankNumber.setTextColor(resources.getColor(textColor, context.theme))
            tvRankPlayerName.setTextColor(resources.getColor(textColor, context.theme))
            tvRankDescription.setTextColor(resources.getColor(textColor, context.theme))
        }
    }

    private fun setText(item: DetailEventItem) {
        with(binding) {
            tvRankNumber.text = item.member.memberRank.toString()
            tvRankPlayerName.text = item.member.memberAccount
            tvRankDescription.text = item.member.memberPoint.toString()
        }
    }
}