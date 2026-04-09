package mobi.blackbears.bbplay.screens.login.domain.model

data class RequestCodePayload(
    val encodedData: String,
    val nextRequestCodeTime: Long,
)