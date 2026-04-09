package mobi.blackbears.bbplay.common.domain.model

import androidx.annotation.DrawableRes
import androidx.annotation.Keep
import mobi.blackbears.bbplay.R

/* Тут я сохраню картинки, если вдруг захотят поменять на подгрузку по url с интернета
*  dota - https://eu3.icafecloud.com/images/dota2.jpg
*  lol - https://eu3.icafecloud.com/images/lol.jpg
*  csgo - https://eu3.icafecloud.com/images/csgo.jpg
*  valorant - https://eu3.icafecloud.com/images/valorant.jpg
*  fortnite - https://eu3.icafecloud.com/images/fortnite.jpg
*  */

@Keep
enum class GamesStates(
    val gameName: String,
    val urlGame: String,
    @DrawableRes
    val imageItem: Int,
    @DrawableRes
    val imageHeader: Int
) {
    DOTA(
        "dota2",
        "dota2-cafe-player",
        imageItem = R.drawable.dr_dota_item,
        imageHeader = R.drawable.dr_dota_header
    ),
    LOL(
        "lol",
        "lol-cafe-player",
        imageItem = R.drawable.dr_lol_item,
        imageHeader = R.drawable.dr_lol_header
    ),
    CSGO(
        "csgo",
        "csgo-cafe-player",
        imageItem = R.drawable.dr_csgo_item,
        imageHeader = R.drawable.dr_csgo_header
    ),
    VALORANT(
        "valorant",
        "valorant-cafe-player",
        imageItem = R.drawable.dr_valorant_item,
        imageHeader = R.drawable.dr_valorant_header
    ),
    FORTNITE(
        "fortnite",
        "fortnite-cafe-player",
        imageItem = R.drawable.dr_fortnite_item,
        imageHeader = R.drawable.dr_fortnite_header
    ),
    ALL(
        "all",
        "all",
        imageItem = R.drawable.dr_all_games_item,
        imageHeader = R.drawable.dr_all_games_header
    )
}