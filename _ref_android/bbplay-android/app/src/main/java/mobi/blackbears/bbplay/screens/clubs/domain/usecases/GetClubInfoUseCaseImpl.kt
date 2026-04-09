package mobi.blackbears.bbplay.screens.clubs.domain.usecases

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.withContext
import mobi.blackbears.bbplay.BuildConfig
import mobi.blackbears.bbplay.screens.clubs.data.network.ClubsRepository
import mobi.blackbears.bbplay.screens.clubs.domain.model.ClubInfo
import java.util.concurrent.CancellationException
import javax.inject.Inject

class GetClubInfoUseCaseImpl @Inject constructor(
    private val repository: ClubsRepository
) : GetClubInfoUseCase {
    override suspend fun getClubsInfo(): List<ClubInfo> =
        withContext(Dispatchers.IO) {
            val firstClub = async { loadFirstClub() }
            val secondClub = async { loadSecondClub() }
            awaitAll(secondClub, firstClub).filter { it != ClubInfo.EMPTY }
        }

    private suspend fun loadFirstClub(): ClubInfo = try {
        repository.getClubInfo(BuildConfig.BBPLAY_ID_CAFE)
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        ClubInfo.EMPTY
    }

    private suspend fun loadSecondClub(): ClubInfo = try {
        repository.getClubInfo(BuildConfig.ID_CAFE_SECOND_CLUB)
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        ClubInfo.EMPTY
    }
}