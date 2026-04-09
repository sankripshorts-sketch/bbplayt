package mobi.blackbears.bbplay.screens.leaderboard.fragments.tournament.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import mobi.blackbears.bbplay.common.fragment.adapter.GeneralListAdapter
import mobi.blackbears.bbplay.databinding.ItemTournamentBinding
import mobi.blackbears.bbplay.screens.leaderboard.fragments.tournament.model.GameItem

class GamesListAdapter : GeneralListAdapter<GameItem, GameViewHolder>() {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): GameViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        return GameViewHolder(ItemTournamentBinding.inflate(inflater, parent, false))
    }

    override fun onBindViewHolder(holder: GameViewHolder, position: Int) {
        holder.bind(getItem(position))
    }
}