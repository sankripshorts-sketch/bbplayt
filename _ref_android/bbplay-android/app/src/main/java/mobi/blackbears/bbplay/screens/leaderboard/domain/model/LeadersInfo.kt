package mobi.blackbears.bbplay.screens.leaderboard.domain.model

import mobi.blackbears.bbplay.screens.leaderboard.domain.model.rank.RankInfo

/** Дополнительная обертка над sealed классом т.к. dagger binds
 *  и соответственно интерфейс mapper не может походу сгенерить
 *  абстракстный класс.
 *  @see LeadersInfoMapper */
data class LeadersInfo (val ranks: List<RankInfo>)