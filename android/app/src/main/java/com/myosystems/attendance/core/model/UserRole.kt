package com.myosystems.attendance.core.model

enum class UserRole {
    SUPER_ADMIN,
    SCHOOL_ADMIN,
    GATE_STAFF,
    TEACHER,
    UNKNOWN;

    val backendValue: String
        get() = when (this) {
            SUPER_ADMIN -> "super_admin"
            SCHOOL_ADMIN -> "school_admin"
            GATE_STAFF -> "gate_staff"
            TEACHER -> "teacher"
            UNKNOWN -> "unknown"
        }

    companion object {
        fun fromBackend(value: String): UserRole = when (value) {
            "super_admin" -> SUPER_ADMIN
            "school_admin" -> SCHOOL_ADMIN
            "gate_staff" -> GATE_STAFF
            "teacher" -> TEACHER
            else -> UNKNOWN
        }
    }
}
