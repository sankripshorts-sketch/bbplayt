package mobi.blackbears.bbplay.common.domain.usecases

interface CheckUserExistsOrActiveUseCase {
    /**
     * @return memberId - id пользователя
     * @throws BBError если пользователь не активирован (ограничен в приложении)
     */
    suspend fun invoke(userId: Long): Long
}