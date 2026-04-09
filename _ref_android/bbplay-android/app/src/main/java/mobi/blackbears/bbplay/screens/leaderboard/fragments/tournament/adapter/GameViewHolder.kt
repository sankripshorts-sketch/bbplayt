package mobi.blackbears.bbplay.screens.leaderboard.fragments.tournament.adapter

import androidx.recyclerview.widget.RecyclerView
import coil.api.load
import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.databinding.ItemTournamentBinding
import mobi.blackbears.bbplay.screens.leaderboard.fragments.tournament.model.GameItem

class GameViewHolder(private val binding: ItemTournamentBinding) : RecyclerView.ViewHolder(binding.root) {
    fun bind(gameItem: GameItem) {
        val gameInfo = gameItem.gameInfo

        with(binding) {
            tvTitleGameTournament.text = gameInfo.titleGame
            ivGameTournament.load(gameItem.imageItem)
            val top = gameInfo.topRanksName.take(3)
            tvRankName.text = binding.root.resources.getString(
                R.string.first_three_rank_name,
                top[0], top[1], top[2]
            )

            root.setOnClickListener {
                gameItem.listener(gameItem.gameInfo.titleGame)
            }
        }
    }
}