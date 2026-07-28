package com.myosystems.attendance.core.model

data class StudentSummary(
    val id: Int,
    val schoolId: Int,
    val studentNo: String,
    val firstName: String,
    val lastName: String,
    val gradeLevelId: Int?,
    val sectionId: Int?,
    val guardianName: String?,
    val guardianPhone: String?,
    val photoUrl: String?,
    val qrToken: String,
    val isActive: Boolean,
    val gradeLevelName: String? = null,
    val sectionName: String? = null,
    val currentDayStatus: String? = null,
) {
    val fullName: String
        get() = "$firstName $lastName".trim()
}

data class StudentUpsert(
    val firstName: String,
    val lastName: String,
    val studentNo: String,
    val gradeLevelId: Int?,
    val sectionId: Int?,
    val guardianName: String?,
    val guardianPhone: String?,
    val photoUrl: String?,
    val isActive: Boolean,
)

data class StudentPhotoUploadResult(
    val photoUrl: String,
)
