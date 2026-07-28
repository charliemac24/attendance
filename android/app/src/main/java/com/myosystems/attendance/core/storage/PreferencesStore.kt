package com.myosystems.attendance.core.storage

import android.content.Context
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.myosystems.attendance.core.network.ApiEnvironmentMode
import com.myosystems.attendance.core.network.RuntimeApiConfig
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.appPreferences by preferencesDataStore(name = "attendance_preferences")

@Singleton
class PreferencesStore @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    val preferences: Flow<UserPreferences>
        get() = context.appPreferences.data.map { prefs ->
            val apiEnvironment = ApiEnvironmentMode.fromStorageValue(prefs[API_ENVIRONMENT]) ?: ApiEnvironmentMode.default()
            RuntimeApiConfig.setEnvironment(apiEnvironment)
            UserPreferences(
                lastSelectedKioskId = prefs[LAST_SELECTED_KIOSK_ID],
                soundEnabled = prefs[SOUND_ENABLED] ?: true,
                vibrationEnabled = prefs[VIBRATION_ENABLED] ?: true,
                apiEnvironment = apiEnvironment,
            )
        }

    suspend fun updateLastSelectedKiosk(kioskId: Int?) {
        context.appPreferences.edit { prefs ->
            if (kioskId == null) {
                prefs.remove(LAST_SELECTED_KIOSK_ID)
            } else {
                prefs[LAST_SELECTED_KIOSK_ID] = kioskId
            }
        }
    }

    suspend fun updateSoundEnabled(enabled: Boolean) {
        context.appPreferences.edit { prefs ->
            prefs[SOUND_ENABLED] = enabled
        }
    }

    suspend fun updateVibrationEnabled(enabled: Boolean) {
        context.appPreferences.edit { prefs ->
            prefs[VIBRATION_ENABLED] = enabled
        }
    }

    suspend fun updateApiEnvironment(mode: ApiEnvironmentMode) {
        context.appPreferences.edit { prefs ->
            prefs[API_ENVIRONMENT] = mode.storageValue
        }
        RuntimeApiConfig.setEnvironment(mode)
    }

    suspend fun initializeApiEnvironment() {
        RuntimeApiConfig.setEnvironment(preferences.first().apiEnvironment)
    }

    private companion object {
        val LAST_SELECTED_KIOSK_ID = intPreferencesKey("last_selected_kiosk_id")
        val SOUND_ENABLED = booleanPreferencesKey("sound_enabled")
        val VIBRATION_ENABLED = booleanPreferencesKey("vibration_enabled")
        val API_ENVIRONMENT = stringPreferencesKey("api_environment")
    }
}

data class UserPreferences(
    val lastSelectedKioskId: Int?,
    val soundEnabled: Boolean,
    val vibrationEnabled: Boolean,
    val apiEnvironment: ApiEnvironmentMode,
)
