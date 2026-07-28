package com.myosystems.attendance.feature.students

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.myosystems.attendance.core.common.AppResult
import com.myosystems.attendance.core.common.DispatchersProvider
import com.myosystems.attendance.core.model.StudentSummary
import com.myosystems.attendance.core.model.StudentUpsert
import com.myosystems.attendance.core.model.UserRole
import com.myosystems.attendance.core.util.permissionsFor
import com.myosystems.attendance.domain.repository.AuthRepository
import com.myosystems.attendance.domain.repository.OperationsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@HiltViewModel
class StudentsViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val operationsRepository: OperationsRepository,
    private val dispatchersProvider: DispatchersProvider,
) : ViewModel() {
    private val _uiState = MutableStateFlow(StudentsUiState())
    val uiState: StateFlow<StudentsUiState> = _uiState.asStateFlow()

    private val _editorState = MutableStateFlow<StudentEditorState?>(null)
    val editorState: StateFlow<StudentEditorState?> = _editorState.asStateFlow()

    private val _deleteTarget = MutableStateFlow<StudentSummary?>(null)
    val deleteTarget: StateFlow<StudentSummary?> = _deleteTarget.asStateFlow()

    private val _statusDialog = MutableStateFlow<StudentStatusDialogState?>(null)
    val statusDialog: StateFlow<StudentStatusDialogState?> = _statusDialog.asStateFlow()

    private val _messages = MutableSharedFlow<String>()
    val messages: SharedFlow<String> = _messages.asSharedFlow()

    private var searchJob: Job? = null

    init {
        refresh()
    }

    fun refresh() {
        loadData(refreshing = false)
    }

    fun pullToRefresh() {
        loadData(refreshing = true)
    }

    fun updateSearch(value: String) {
        _uiState.value = _uiState.value.copy(search = value)
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            kotlinx.coroutines.delay(250)
            loadStudents(refreshing = true)
        }
    }

    fun updateRoster(filter: StudentRosterFilter) {
        _uiState.value = _uiState.value.copy(rosterFilter = filter)
        loadStudents(refreshing = true)
    }

    fun updateGradeFilter(gradeId: String) {
        _uiState.value = _uiState.value.copy(
            selectedGradeId = gradeId,
            selectedSectionId = if (gradeId == "all") _uiState.value.selectedSectionId else "all",
        )
    }

    fun updateSectionFilter(sectionId: String) {
        _uiState.value = _uiState.value.copy(selectedSectionId = sectionId)
    }

    fun openCreateStudent() {
        _editorState.value = StudentEditorState()
    }

    fun openEditStudent(student: StudentSummary) {
        _editorState.value = StudentEditorState(
            id = student.id,
            firstName = student.firstName,
            lastName = student.lastName,
            studentNo = student.studentNo,
            gradeLevelId = student.gradeLevelId?.toString().orEmpty(),
            sectionId = student.sectionId?.toString().orEmpty(),
            guardianName = student.guardianName.orEmpty(),
            guardianPhone = student.guardianPhone.orEmpty(),
            photoUrl = student.photoUrl.orEmpty(),
            isActive = student.isActive,
            isEdit = true,
        )
    }

    fun updateEditor(transform: (StudentEditorState) -> StudentEditorState) {
        val current = _editorState.value ?: return
        _editorState.value = transform(current)
    }

    fun dismissEditor() {
        _editorState.value = null
    }

    fun confirmDelete(student: StudentSummary) {
        _deleteTarget.value = student
    }

    fun dismissDelete() {
        _deleteTarget.value = null
    }

    fun openStatusDialog(student: StudentSummary, status: String) {
        _statusDialog.value = StudentStatusDialogState(
            studentId = student.id,
            studentName = student.fullName,
            status = status,
            date = java.time.LocalDate.now().toString(),
        )
    }

    fun updateStatusDate(date: String) {
        val current = _statusDialog.value ?: return
        _statusDialog.value = current.copy(date = date)
    }

    fun updateStatusNote(note: String) {
        val current = _statusDialog.value ?: return
        _statusDialog.value = current.copy(note = note)
    }

    fun dismissStatusDialog() {
        _statusDialog.value = null
    }

    fun saveStudent(
        photoBytes: ByteArray?,
        fileName: String?,
        mimeType: String?,
    ) {
        val editor = _editorState.value ?: return
        if (editor.firstName.isBlank() || editor.lastName.isBlank() || editor.studentNo.isBlank()) {
            viewModelScope.launch { _messages.emit("First name, last name, and student number are required") }
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true)
            val result = withContext(dispatchersProvider.io) {
                val uploadedPhotoUrl = if (photoBytes != null && fileName != null && mimeType != null) {
                    when (val uploadResult = operationsRepository.uploadStudentPhoto(photoBytes, fileName, mimeType)) {
                        is AppResult.Success -> uploadResult.data.photoUrl
                        is AppResult.Failure -> return@withContext uploadResult
                    }
                } else {
                    null
                }

                val student = StudentUpsert(
                    firstName = editor.firstName.trim(),
                    lastName = editor.lastName.trim(),
                    studentNo = editor.studentNo.trim(),
                    gradeLevelId = editor.gradeLevelId.toIntOrNull(),
                    sectionId = editor.sectionId.toIntOrNull(),
                    guardianName = editor.guardianName.trim().ifBlank { null },
                    guardianPhone = editor.guardianPhone.trim().ifBlank { null },
                    photoUrl = uploadedPhotoUrl ?: editor.photoUrl.ifBlank { null },
                    isActive = editor.isActive,
                )

                if (editor.id == null) {
                    operationsRepository.createStudent(student)
                } else {
                    operationsRepository.updateStudent(editor.id, student)
                }
            }

            _uiState.value = _uiState.value.copy(isSaving = false)
            when (result) {
                is AppResult.Success -> {
                    _editorState.value = null
                    _messages.emit(if (editor.id == null) "Student created" else "Student updated")
                    loadStudents(refreshing = true)
                }
                is AppResult.Failure -> _messages.emit(result.message)
            }
        }
    }

    fun deleteStudent() {
        val student = _deleteTarget.value ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true)
            val result = withContext(dispatchersProvider.io) {
                operationsRepository.deleteStudent(student.id)
            }
            _uiState.value = _uiState.value.copy(isSaving = false)
            when (result) {
                is AppResult.Success -> {
                    _deleteTarget.value = null
                    _messages.emit("Student deleted")
                    loadStudents(refreshing = true)
                }
                is AppResult.Failure -> _messages.emit(result.message)
            }
        }
    }

    fun regenerateQrToken(student: StudentSummary) {
        viewModelScope.launch {
            val result = withContext(dispatchersProvider.io) {
                operationsRepository.regenerateStudentQrToken(student.id)
            }
            when (result) {
                is AppResult.Success -> {
                    _messages.emit("QR token regenerated for ${student.fullName}")
                    loadStudents(refreshing = true)
                }
                is AppResult.Failure -> _messages.emit(result.message)
            }
        }
    }

    fun applyStatus() {
        val dialog = _statusDialog.value ?: return
        viewModelScope.launch {
            val result = withContext(dispatchersProvider.io) {
                operationsRepository.updateAttendanceStatus(
                    studentId = dialog.studentId,
                    status = dialog.status,
                    date = dialog.date,
                    note = dialog.note.ifBlank { null },
                )
            }
            when (result) {
                is AppResult.Success -> {
                    _statusDialog.value = null
                    _messages.emit("${dialog.studentName} marked ${dialog.status}")
                    loadStudents(refreshing = true)
                }
                is AppResult.Failure -> _messages.emit(result.message)
            }
        }
    }

    fun bulkAssignSection(studentIds: List<Int>, sectionId: Int?) {
        if (studentIds.isEmpty()) return
        viewModelScope.launch {
            val result = withContext(dispatchersProvider.io) {
                operationsRepository.bulkAssignStudentsToSection(studentIds, sectionId)
            }
            when (result) {
                is AppResult.Success -> {
                    _messages.emit("Section assignment updated")
                    loadStudents(refreshing = true)
                }
                is AppResult.Failure -> _messages.emit(result.message)
            }
        }
    }

    private fun loadData(refreshing: Boolean) {
        viewModelScope.launch {
            val current = _uiState.value
            _uiState.value = current.copy(
                isLoading = !refreshing,
                isRefreshing = refreshing,
                errorMessage = null,
            )

            val userDeferred = async(dispatchersProvider.io) { authRepository.getCurrentUser() }
            val gradesDeferred = async(dispatchersProvider.io) { operationsRepository.getGradeLevels() }
            val sectionsDeferred = async(dispatchersProvider.io) { operationsRepository.getSections() }
            val studentsDeferred = async(dispatchersProvider.io) {
                operationsRepository.getStudents(
                    search = current.search.trim().ifBlank { null },
                    status = current.rosterFilter.backendValue,
                )
            }

            val userResult = userDeferred.await()
            val gradesResult = gradesDeferred.await()
            val sectionsResult = sectionsDeferred.await()
            val studentsResult = studentsDeferred.await()

            val role = when (userResult) {
                is AppResult.Success -> userResult.data?.role ?: UserRole.UNKNOWN
                is AppResult.Failure -> UserRole.UNKNOWN
            }
            val permissions = permissionsFor(role)
            val failure = listOf(userResult, gradesResult, sectionsResult, studentsResult)
                .filterIsInstance<AppResult.Failure>()
                .firstOrNull()

            _uiState.value = _uiState.value.copy(
                isLoading = false,
                isRefreshing = false,
                students = (studentsResult as? AppResult.Success)?.data.orEmpty(),
                grades = (gradesResult as? AppResult.Success)?.data.orEmpty(),
                sections = (sectionsResult as? AppResult.Success)?.data.orEmpty(),
                errorMessage = failure?.message,
                canManageStudents = permissions.canManageStudents,
                canShowStudentRowActions = role != UserRole.GATE_STAFF,
                canMarkAbsent = permissions.canMarkAbsent,
                canMarkExcused = permissions.canMarkExcused,
            )
        }
    }

    private fun loadStudents(refreshing: Boolean) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isRefreshing = refreshing,
                errorMessage = null,
            )
            val result = withContext(dispatchersProvider.io) {
                operationsRepository.getStudents(
                    search = _uiState.value.search.trim().ifBlank { null },
                    status = _uiState.value.rosterFilter.backendValue,
                )
            }
            when (result) {
                is AppResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isRefreshing = false,
                        students = result.data,
                    )
                }
                is AppResult.Failure -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isRefreshing = false,
                        errorMessage = result.message,
                    )
                }
            }
        }
    }
}
