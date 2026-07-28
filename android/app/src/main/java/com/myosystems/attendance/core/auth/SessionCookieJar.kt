package com.myosystems.attendance.core.auth

import com.myosystems.attendance.core.storage.SecureCookieStore
import javax.inject.Inject
import javax.inject.Singleton
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl

@Singleton
class SessionCookieJar @Inject constructor(
    private val secureCookieStore: SecureCookieStore,
) : CookieJar {
    override fun loadForRequest(url: HttpUrl): List<Cookie> = secureCookieStore.load(url)

    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        secureCookieStore.save(url, cookies)
    }

    fun clear() {
        secureCookieStore.clear()
    }
}
