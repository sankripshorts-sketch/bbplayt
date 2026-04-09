package mobi.blackbears.bbplay.common.domain.model

/**
 * @param memberId Id зарегистрированного пользователя
 * @param memberIsActive Активирован ли аккаунт. 1 - да, 0 - нет
 */
data class UserActive(
    val memberId: Long,
    val memberIsActive: Long
) {
    companion object {
        const val DISABLED_MEMBER = 0L
    }
}