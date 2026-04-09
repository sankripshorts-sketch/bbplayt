package mobi.blackbears.bbplay.screens.login.data.preferences

import android.content.Context
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.*
import javax.inject.Inject

private val Context.dataStore by preferencesDataStore(name = "bbplay_credentials_preferences")
private val ENCODED_DATA_KEY = stringPreferencesKey("bbplay_encoded_data_key")
private val NEXT_TIME_TO_REQUEST_CODE_KEY = longPreferencesKey("bbplay_next_time_to_request_key")

class CredentialsManagerImpl @Inject constructor(private val context: Context) :
    CredentialsManager {

    override fun getVerificationCredentials(): Flow<Pair<String, Long>> = context.dataStore.data.map {
        val encodedData = it[ENCODED_DATA_KEY] ?: ""
        val nextRequestCodeTime = it[NEXT_TIME_TO_REQUEST_CODE_KEY] ?: 0L
        Pair(encodedData, nextRequestCodeTime)
    }

    override suspend fun clearVerificationCredentials() {
        context.dataStore.edit { credentials ->
            credentials[ENCODED_DATA_KEY] = ""
            credentials[NEXT_TIME_TO_REQUEST_CODE_KEY] = 0L
        }
    }

    override suspend fun saveVerificationCredentials(
        encodedData: String,
        nextRequestCodeTime: Long
    ) {
        context.dataStore.edit { credentials ->
            credentials[ENCODED_DATA_KEY] = encodedData
            credentials[NEXT_TIME_TO_REQUEST_CODE_KEY] = nextRequestCodeTime
        }
    }
}