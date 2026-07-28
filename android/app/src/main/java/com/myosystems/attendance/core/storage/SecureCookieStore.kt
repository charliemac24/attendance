package com.myosystems.attendance.core.storage

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import okhttp3.Cookie
import okhttp3.HttpUrl

@Singleton
class SecureCookieStore @Inject constructor(
    @ApplicationContext context: Context,
    private val json: Json,
) {
    private val prefs by lazy(LazyThreadSafetyMode.SYNCHRONIZED) {
        EncryptedSharedPreferences.create(
            context,
            FILE_NAME,
            MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    fun load(url: HttpUrl): List<Cookie> {
        val now = System.currentTimeMillis()
        val toDelete = mutableListOf<String>()
        val cookies = prefs.all.mapNotNull { (key, value) ->
            val raw = value as? String ?: return@mapNotNull null
            runCatching {
                val stored = json.decodeFromString<StoredCookie>(raw)
                stored.toCookie()
            }.getOrNull()?.also { cookie ->
                if (cookie.expiresAt < now) {
                    toDelete += key
                }
            }
        }.filter { cookie ->
            cookie.expiresAt >= now && cookie.matches(url)
        }

        if (toDelete.isNotEmpty()) {
            prefs.edit().apply {
                toDelete.forEach(::remove)
            }.apply()
        }

        return cookies
    }

    fun save(url: HttpUrl, cookies: List<Cookie>) {
        if (cookies.isEmpty()) return
        prefs.edit().apply {
            cookies.forEach { cookie ->
                putString(
                    cookie.storageKey(url),
                    json.encodeToString(StoredCookie.serializer(), StoredCookie.from(cookie)),
                )
            }
        }.apply()
    }

    fun clear() {
        prefs.edit().clear().apply()
    }

    private fun Cookie.storageKey(url: HttpUrl): String = buildString {
        append(name)
        append('|')
        append(domain.ifBlank { url.host })
        append('|')
        append(path)
    }

    @Serializable
    private data class StoredCookie(
        val name: String,
        val value: String,
        val expiresAt: Long,
        val domain: String,
        val path: String,
        val secure: Boolean,
        val httpOnly: Boolean,
        val persistent: Boolean,
        val hostOnly: Boolean,
    ) {
        fun toCookie(): Cookie {
            val builder = Cookie.Builder()
                .name(name)
                .value(value)
                .path(path)
                .expiresAt(expiresAt)

            if (hostOnly) {
                builder.hostOnlyDomain(domain)
            } else {
                builder.domain(domain)
            }
            if (secure) builder.secure()
            if (httpOnly) builder.httpOnly()
            return builder.build()
        }

        companion object {
            fun from(cookie: Cookie): StoredCookie = StoredCookie(
                name = cookie.name,
                value = cookie.value,
                expiresAt = cookie.expiresAt,
                domain = cookie.domain,
                path = cookie.path,
                secure = cookie.secure,
                httpOnly = cookie.httpOnly,
                persistent = cookie.persistent,
                hostOnly = cookie.hostOnly,
            )
        }
    }

    private companion object {
        const val FILE_NAME = "attendance_secure_cookies"
    }
}
