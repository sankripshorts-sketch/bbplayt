package mobi.blackbears.bbplay.common.data.model

import com.google.gson.annotations.SerializedName

data class BBResponse <T>(
    @SerializedName("code")
    val code: String,

    @SerializedName("message")
    val message: String,

    @SerializedName("data")
    val data: T?
)

open class BBError(
    val code: String,
    val responseMessage: String
) : Exception(responseMessage) {

    constructor(responseMessage: String) : this("", responseMessage)

    constructor(response: BBResponse<*>) : this(response.code, response.message)

    companion object {
        val NO_INTERNET = BBError("400", "Internet disconnected")
    }
}

class LoginError(code: String, responseMessage: String) : BBError(code, responseMessage)

fun <T> BBResponse<T>.getDataOrThrowException(): T {
    if (data == null) throw BBError(code, message)
    return data
}