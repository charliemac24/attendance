package com.myosystems.attendance.di

import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import com.myosystems.attendance.BuildConfig
import com.myosystems.attendance.core.auth.SessionCookieJar
import com.myosystems.attendance.core.auth.SessionExpiryHandler
import com.myosystems.attendance.core.network.RuntimeApiConfig
import com.myosystems.attendance.data.remote.auth.AuthApiService
import com.myosystems.attendance.data.remote.operations.OperationsApiService
import com.myosystems.attendance.data.remote.scanner.ScannerApiService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides
    @Singleton
    fun provideOkHttpClient(
        sessionCookieJar: SessionCookieJar,
        sessionExpiryHandler: SessionExpiryHandler,
    ): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BASIC else HttpLoggingInterceptor.Level.NONE
        }

        return OkHttpClient.Builder()
            .cookieJar(sessionCookieJar)
            .callTimeout(30, TimeUnit.SECONDS)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor { chain ->
                val configuredBaseUrl = RuntimeApiConfig.getBaseUrl().toHttpUrl()
                val originalRequest = chain.request()
                val rewrittenUrl = originalRequest.url.newBuilder()
                    .scheme(configuredBaseUrl.scheme)
                    .host(configuredBaseUrl.host)
                    .port(configuredBaseUrl.port)
                    .build()
                chain.proceed(originalRequest.newBuilder().url(rewrittenUrl).build())
            }
            .addInterceptor { chain ->
                val response = chain.proceed(chain.request())
                if (response.code == 401) {
                    sessionExpiryHandler.onUnauthorized()
                }
                response
            }
            .addInterceptor(logging)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(
        okHttpClient: OkHttpClient,
        json: Json,
    ): Retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()

    @Provides
    @Singleton
    fun provideAuthApiService(retrofit: Retrofit): AuthApiService =
        retrofit.create(AuthApiService::class.java)

    @Provides
    @Singleton
    fun provideScannerApiService(retrofit: Retrofit): ScannerApiService =
        retrofit.create(ScannerApiService::class.java)

    @Provides
    @Singleton
    fun provideOperationsApiService(retrofit: Retrofit): OperationsApiService =
        retrofit.create(OperationsApiService::class.java)
}
