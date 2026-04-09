package mobi.blackbears.bbplay.common.data.model

import com.google.gson.annotations.SerializedName

private const val AWARD_RECEIVED_CODE = 2
private const val SUCCESS_CODE = 200
private const val CREATED_CODE = 201
private const val SUCCESSFUL_CODE = 3
private const val VERIFICATION_REQUIRED_CODE = 412

data class ProxyBBResponse<T>(
    @SerializedName("code")
    val code: Int,

    @SerializedName("message")
    val message: String,

    @SerializedName("private_key")
    val privateKey: String,

    @SerializedName("data")
    val data: T?,

    @SerializedName("member")
    val memberResponse: MemberResponse?,

    @SerializedName("next_request_sms_time")
    val nextRequestSmsTime: Long?,

    @SerializedName("encoded_data")
    val encodedData: String?,
)

// todo: согласовать коды с бэкендом, чтобы устранить зависимость от message
fun <T> ProxyBBResponse<T>.isSuccessOrThrowException(): Boolean {
    if (this.code == AWARD_RECEIVED_CODE && this.message == "Award received") return true
    if (this.code == SUCCESS_CODE && this.message == "success") return true
    if (this.code == SUCCESSFUL_CODE && this.message in setOf("Successful", "Succes")) return true
    if (this.code == CREATED_CODE) return true
    if (this.code == VERIFICATION_REQUIRED_CODE && this.message == "Verification required.") return true
    throw BBError(this.code.toString(), this.message)
}