package com.myosystems.attendance.di

import com.myosystems.attendance.core.common.DefaultDispatchersProvider
import com.myosystems.attendance.core.common.DispatchersProvider
import com.myosystems.attendance.core.storage.PreferencesStore
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.json.Json

@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    @OptIn(ExperimentalSerializationApi::class)
    @Provides
    @Singleton
    fun provideJson(): Json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
    }

    @Provides
    @Singleton
    fun provideDispatchersProvider(): DispatchersProvider = DefaultDispatchersProvider
}
