package mobi.blackbears.bbplay.common.preferences

import android.content.Context
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.*
import mobi.blackbears.bbplay.common.extensions.emptyString
import javax.inject.Inject

private val Context.dataStore by preferencesDataStore(name = "bbplay_preferences")
private val USER_ID = longPreferencesKey("bbplay_user_id")
private val UID_USER = stringPreferencesKey("bbplay_uid")
private val USER_NICK = stringPreferencesKey("bbplay_user_nickname")
private val USER_PRIVATE_KEY = stringPreferencesKey("bbplay_user_private_key")
private val USER_PHONE_KEY = stringPreferencesKey("bbplay_user_phone_key")
private val EMAIL_KEY = stringPreferencesKey("bbplay_user_email_key")

class PreferenceManagerImpl @Inject constructor(private val context: Context) : PreferenceManager {

    private var cachedUserData: UserData? = null

    override suspend fun setUserData(userData: UserData) {
        context.dataStore.edit { settings ->
            userData.apply {
                settings[USER_ID] = userId
                settings[UID_USER] = uid
                settings[USER_NICK] = nickname
                settings[USER_PHONE_KEY] = phone
                settings[EMAIL_KEY] = email
                settings[USER_PRIVATE_KEY] = userPrivateKey
            }
        }
    }

    override fun getUserData(): Flow<UserData> = context.dataStore.data.map {
        val userId = it[USER_ID] ?: -1
        val userUid = it[UID_USER] ?: emptyString()
        val nickname = it[USER_NICK] ?: emptyString()
        val phone = it[USER_PHONE_KEY] ?: emptyString()
        val email = it[EMAIL_KEY] ?: emptyString()
        val privateKey = it[USER_PRIVATE_KEY] ?: emptyString()
        UserData(
            userId = userId,
            uid = userUid,
            email = email,
            nickname = nickname,
            phone = phone,
            userPrivateKey = privateKey,
        )
    }

    override fun setCachedUserData(userData: UserData) {
        cachedUserData = userData
    }

    override fun getCachedUserData(): UserData = cachedUserData ?: UserData.NONE
}