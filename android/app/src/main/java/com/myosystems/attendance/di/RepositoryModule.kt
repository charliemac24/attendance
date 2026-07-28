package com.myosystems.attendance.di

import com.myosystems.attendance.data.repository.AuthRepositoryImpl
import com.myosystems.attendance.data.repository.OperationsRepositoryImpl
import com.myosystems.attendance.data.repository.ScannerRepositoryImpl
import com.myosystems.attendance.domain.repository.AuthRepository
import com.myosystems.attendance.domain.repository.OperationsRepository
import com.myosystems.attendance.domain.repository.ScannerRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds
    @Singleton
    abstract fun bindAuthRepository(impl: AuthRepositoryImpl): AuthRepository

    @Binds
    @Singleton
    abstract fun bindScannerRepository(impl: ScannerRepositoryImpl): ScannerRepository

    @Binds
    @Singleton
    abstract fun bindOperationsRepository(impl: OperationsRepositoryImpl): OperationsRepository
}
