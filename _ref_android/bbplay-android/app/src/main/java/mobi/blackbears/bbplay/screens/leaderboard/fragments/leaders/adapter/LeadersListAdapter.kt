package mobi.blackbears.bbplay.screens.leaderboard.fragments.leaders.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import mobi.blackbears.bbplay.common.fragment.adapter.GeneralListAdapter
import mobi.blackbears.bbplay.databinding.ItemRankBinding
import mobi.blackbears.bbplay.screens.leaderboard.fragments.leaders.model.LeaderItem

class LeadersListAdapter : GeneralListAdapter<LeaderItem, LeaderViewHolder>() {
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): LeaderViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        return LeaderViewHolder(ItemRankBinding.inflate(inflater, parent, false))
    }

    override fun onBindViewHolder(holder: LeaderViewHolder, position: Int) {
        holder.bind(getItem(position), position + 1)
    }
}