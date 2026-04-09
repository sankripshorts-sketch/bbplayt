package mobi.blackbears.bbplay.screens.events.data.mapper

import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.screens.events.data.model.CheckRewardResponse
import mobi.blackbears.bbplay.screens.events.data.model.CodeTypeResponse
import mobi.blackbears.bbplay.screens.events.domain.model.CodeRewardType
import javax.inject.Inject

class CheckRewardMapper @Inject constructor(): Mapper<CheckRewardResponse, CodeRewardType> {
    override fun transform(data: CheckRewardResponse): CodeRewardType = data.code.run {
        when(this) {
            CodeTypeResponse.REWARD_RECEIVED -> CodeRewardType.REWARD_RECEIVED
            CodeTypeResponse.REWARD_ALREADY_TAKEN -> CodeRewardType.REWARD_ALREADY_TAKEN
            CodeTypeResponse.REWARD_NOT_TAKEN -> CodeRewardType.REWARD_NOT_TAKEN
            CodeTypeResponse.REWARD_NOT_EXIST -> CodeRewardType.REWARD_NOT_EXIST
        }
    }
}