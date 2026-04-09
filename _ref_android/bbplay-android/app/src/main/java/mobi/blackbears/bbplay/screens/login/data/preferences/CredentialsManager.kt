package mobi.blackbears.bbplay.screens.login.data.preferences

import kotlinx.coroutines.flow.Flow

interface CredentialsManager {
    suspend fun saveVerificationCredentials(
        encodedData: String,
        nextRequestCodeTime: Long
    )

    fun getVerificationCredentials(): Flow<Pair<String, Long>>

    suspend fun clearVerificationCredentials()
}