package com.myosystems.attendance.feature.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.myosystems.attendance.core.common.AppResult
import com.myosystems.attendance.core.common.DispatchersProvider
import com.myosystems.attendance.domain.repository.OperationsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
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
class AdminViewModel @Inject constructor(
    private val operationsRepository: OperationsRepository,
    private val dispatchersProvider: DispatchersProvider,
) : ViewModel() {
    private companion object {
        val weekdays = listOf("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
    }

    private val _uiState = MutableStateFlow(AdminUiState())
    val uiState: StateFlow<AdminUiState> = _uiState.asStateFlow()

    private val _dialogState = MutableStateFlow<AdminDialogState>(AdminDialogState.None)
    val dialogState: StateFlow<AdminDialogState> = _dialogState.asStateFlow()

    private val _messages = MutableSharedFlow<String>()
    val messages: SharedFlow<String> = _messages.asSharedFlow()

    init {
        loadAdminData()
    }

    fun refresh() {
        loadAdminData(refreshing = true)
    }

    fun selectTab(tab: AdminTab) {
        _uiState.value = _uiState.value.copy(selectedTab = tab)
    }

    fun openNewGradeDialog() {
        _dialogState.value = AdminDialogState.GradeEditor()
    }

    fun openEditGradeDialog(id: Int) {
        val grade = _uiState.value.grades.firstOrNull { it.id == id } ?: return
        _dialogState.value = AdminDialogState.GradeEditor(
            id = grade.id,
            name = grade.name,
            lateTimeOverride = grade.lateTimeOverride.orEmpty(),
            lateTimeOverridesByWeekday = weekdays.associateWith { weekday ->
                (grade.lateTimeOverridesByWeekday?.get(weekday)
                    ?: if (weekday == "Friday") grade.fridayLateTimeOverride else null).orEmpty()
            },
        )
    }

    fun updateGradeDraft(
        name: String? = null,
        lateTimeOverride: String? = null,
        lateTimeOverridesByWeekday: Map<String, String>? = null,
    ) {
        val current = _dialogState.value as? AdminDialogState.GradeEditor ?: return
        _dialogState.value = current.copy(
            name = name ?: current.name,
            lateTimeOverride = lateTimeOverride ?: current.lateTimeOverride,
            lateTimeOverridesByWeekday = lateTimeOverridesByWeekday ?: current.lateTimeOverridesByWeekday,
        )
    }

    fun saveGrade() {
        val draft = _dialogState.value as? AdminDialogState.GradeEditor ?: return
        if (draft.name.isBlank()) return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true)
            val result = withContext(dispatchersProvider.io) {
                if (draft.id == null) {
                    operationsRepository.createGradeLevel(
                        name = draft.name.trim(),
                        lateTimeOverride = draft.lateTimeOverride.ifBlank { null },
                        lateTimeOverridesByWeekday = draft.lateTimeOverridesByWeekday.filterValues { it.isNotBlank() },
                    )
                } else {
                    operationsRepository.updateGradeLevel(
                        id = draft.id,
                        name = draft.name.trim(),
                        lateTimeOverride = draft.lateTimeOverride.ifBlank { null },
                        lateTimeOverridesByWeekday = draft.lateTimeOverridesByWeekday.filterValues { it.isNotBlank() },
                    )
                }
            }
            handleSaveResult(result, if (draft.id == null) "Grade created" else "Grade updated")
        }
    }

    fun confirmDeleteGrade(id: Int) {
        val grade = _uiState.value.grades.firstOrNull { it.id == id } ?: return
        _dialogState.value = AdminDialogState.DeleteConfirmation(
            id = id,
            label = grade.name,
            message = "Delete grade level ${grade.name}? This cannot be undone.",
            target = DeleteTarget.Grade,
        )
    }

    fun openNewSectionDialog() {
        _dialogState.value = AdminDialogState.SectionEditor()
    }

    fun openEditSectionDialog(id: Int) {
        val section = _uiState.value.sections.firstOrNull { it.id == id } ?: return
        _dialogState.value = AdminDialogState.SectionEditor(
            id = section.id,
            name = section.name,
            gradeLevelId = section.gradeLevelId.toString(),
            lateTimeOverride = section.lateTimeOverride.orEmpty(),
            lateTimeOverridesByWeekday = weekdays.associateWith { weekday ->
                (section.lateTimeOverridesByWeekday?.get(weekday)
                    ?: if (weekday == "Friday") section.fridayLateTimeOverride else null).orEmpty()
            },
        )
    }

    fun updateSectionDraft(
        name: String? = null,
        gradeLevelId: String? = null,
        lateTimeOverride: String? = null,
        lateTimeOverridesByWeekday: Map<String, String>? = null,
    ) {
        val current = _dialogState.value as? AdminDialogState.SectionEditor ?: return
        _dialogState.value = current.copy(
            name = name ?: current.name,
            gradeLevelId = gradeLevelId ?: current.gradeLevelId,
            lateTimeOverride = lateTimeOverride ?: current.lateTimeOverride,
            lateTimeOverridesByWeekday = lateTimeOverridesByWeekday ?: current.lateTimeOverridesByWeekday,
        )
    }

    fun saveSection() {
        val draft = _dialogState.value as? AdminDialogState.SectionEditor ?: return
        val gradeLevelId = draft.gradeLevelId.toIntOrNull() ?: return
        if (draft.name.isBlank()) return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true)
            val result = withContext(dispatchersProvider.io) {
                if (draft.id == null) {
                    operationsRepository.createSection(
                        name = draft.name.trim(),
                        gradeLevelId = gradeLevelId,
                        lateTimeOverride = draft.lateTimeOverride.ifBlank { null },
                        lateTimeOverridesByWeekday = draft.lateTimeOverridesByWeekday.filterValues { it.isNotBlank() },
                    )
                } else {
                    operationsRepository.updateSection(
                        id = draft.id,
                        name = draft.name.trim(),
                        gradeLevelId = gradeLevelId,
                        lateTimeOverride = draft.lateTimeOverride.ifBlank { null },
                        lateTimeOverridesByWeekday = draft.lateTimeOverridesByWeekday.filterValues { it.isNotBlank() },
                    )
                }
            }
            handleSaveResult(result, if (draft.id == null) "Section created" else "Section updated")
        }
    }

    fun confirmDeleteSection(id: Int) {
        val section = _uiState.value.sections.firstOrNull { it.id == id } ?: return
        _dialogState.value = AdminDialogState.DeleteConfirmation(
            id = id,
            label = section.name,
            message = "Delete section ${section.name}? This cannot be undone.",
            target = DeleteTarget.Section,
        )
    }

    fun openNewKioskDialog() {
        _dialogState.value = AdminDialogState.KioskEditor()
    }

    fun openEditKioskDialog(id: Int) {
        val kiosk = _uiState.value.kiosks.firstOrNull { it.id == id } ?: return
        _dialogState.value = AdminDialogState.KioskEditor(
            id = kiosk.id,
            name = kiosk.name,
            slug = kiosk.slug,
        )
    }

    fun updateKioskDraft(name: String? = null, slug: String? = null) {
        val current = _dialogState.value as? AdminDialogState.KioskEditor ?: return
        _dialogState.value = current.copy(
            name = name ?: current.name,
            slug = slug ?: current.slug,
        )
    }

    fun saveKiosk() {
        val draft = _dialogState.value as? AdminDialogState.KioskEditor ?: return
        if (draft.name.isBlank() || draft.slug.isBlank()) return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true)
            val result = withContext(dispatchersProvider.io) {
                if (draft.id == null) {
                    operationsRepository.createKiosk(
                        name = draft.name.trim(),
                        slug = draft.slug.trim(),
                    )
                } else {
                    operationsRepository.updateKiosk(
                        id = draft.id,
                        name = draft.name.trim(),
                        slug = draft.slug.trim(),
                    )
                }
            }
            handleSaveResult(result, if (draft.id == null) "Kiosk created" else "Kiosk updated")
        }
    }

    fun confirmDeleteKiosk(id: Int) {
        val kiosk = _uiState.value.kiosks.firstOrNull { it.id == id } ?: return
        _dialogState.value = AdminDialogState.DeleteConfirmation(
            id = id,
            label = kiosk.name,
            message = "Delete kiosk ${kiosk.name}? This cannot be undone.",
            target = DeleteTarget.Kiosk,
        )
    }

    fun openNewHolidayDialog() {
        _dialogState.value = AdminDialogState.HolidayEditor()
    }

    fun openEditHolidayDialog(id: Int) {
        val holiday = _uiState.value.holidays.firstOrNull { it.id == id } ?: return
        _dialogState.value = AdminDialogState.HolidayEditor(
            id = holiday.id,
            date = holiday.date,
            name = holiday.name,
            type = holiday.type,
            isRecurring = holiday.isRecurring,
        )
    }

    fun updateHolidayDraft(
        date: String? = null,
        name: String? = null,
        type: String? = null,
        isRecurring: Boolean? = null,
    ) {
        val current = _dialogState.value as? AdminDialogState.HolidayEditor ?: return
        _dialogState.value = current.copy(
            date = date ?: current.date,
            name = name ?: current.name,
            type = type ?: current.type,
            isRecurring = isRecurring ?: current.isRecurring,
        )
    }

    fun saveHoliday() {
        val draft = _dialogState.value as? AdminDialogState.HolidayEditor ?: return
        if (draft.date.isBlank() || draft.name.isBlank()) return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true)
            val result = withContext(dispatchersProvider.io) {
                if (draft.id == null) {
                    operationsRepository.createHoliday(
                        date = draft.date,
                        name = draft.name.trim(),
                        type = draft.type,
                        isRecurring = draft.isRecurring,
                    )
                } else {
                    operationsRepository.updateHoliday(
                        id = draft.id,
                        date = draft.date,
                        name = draft.name.trim(),
                        type = draft.type,
                        isRecurring = draft.isRecurring,
                    )
                }
            }
            handleSaveResult(result, if (draft.id == null) "Holiday created" else "Holiday updated")
        }
    }

    fun confirmDeleteHoliday(id: Int) {
        val holiday = _uiState.value.holidays.firstOrNull { it.id == id } ?: return
        _dialogState.value = AdminDialogState.DeleteConfirmation(
            id = id,
            label = holiday.name,
            message = "Delete holiday ${holiday.name} on ${holiday.date}? This cannot be undone.",
            target = DeleteTarget.Holiday,
        )
    }

    fun dismissDialog() {
        _dialogState.value = AdminDialogState.None
    }

    fun confirmDelete() {
        val dialog = _dialogState.value as? AdminDialogState.DeleteConfirmation ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isDeleting = true)
            val result = withContext(dispatchersProvider.io) {
                when (dialog.target) {
                    DeleteTarget.Grade -> operationsRepository.deleteGradeLevel(dialog.id)
                    DeleteTarget.Section -> operationsRepository.deleteSection(dialog.id)
                    DeleteTarget.Kiosk -> operationsRepository.deleteKiosk(dialog.id)
                    DeleteTarget.Holiday -> operationsRepository.deleteHoliday(dialog.id)
                }
            }
            _uiState.value = _uiState.value.copy(isDeleting = false)
            when (result) {
                is AppResult.Success -> {
                    _dialogState.value = AdminDialogState.None
                    _messages.emit("${dialog.label} deleted")
                    loadAdminData(refreshing = true)
                }
                is AppResult.Failure -> _messages.emit(result.message)
            }
        }
    }

    private fun loadAdminData(refreshing: Boolean = false) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = !refreshing,
                isRefreshing = refreshing,
                errorMessage = null,
            )

            val gradesDeferred = async(dispatchersProvider.io) { operationsRepository.getGradeLevels() }
            val sectionsDeferred = async(dispatchersProvider.io) { operationsRepository.getSections() }
            val kiosksDeferred = async(dispatchersProvider.io) { operationsRepository.getKiosks() }
            val holidaysDeferred = async(dispatchersProvider.io) { operationsRepository.getHolidays() }

            val grades = gradesDeferred.await()
            val sections = sectionsDeferred.await()
            val kiosks = kiosksDeferred.await()
            val holidays = holidaysDeferred.await()

            val firstError = listOf(grades, sections, kiosks, holidays).filterIsInstance<AppResult.Failure>().firstOrNull()

            _uiState.value = _uiState.value.copy(
                isLoading = false,
                isRefreshing = false,
                grades = (grades as? AppResult.Success)?.data.orEmpty(),
                sections = (sections as? AppResult.Success)?.data.orEmpty(),
                kiosks = (kiosks as? AppResult.Success)?.data.orEmpty(),
                holidays = (holidays as? AppResult.Success)?.data.orEmpty(),
                errorMessage = firstError?.message,
            )
        }
    }

    private suspend fun <T> handleSaveResult(
        result: AppResult<T>,
        successMessage: String,
    ) {
        _uiState.value = _uiState.value.copy(isSaving = false)
        when (result) {
            is AppResult.Success -> {
                _dialogState.value = AdminDialogState.None
                _messages.emit(successMessage)
                loadAdminData(refreshing = true)
            }
            is AppResult.Failure -> _messages.emit(result.message)
        }
    }
}
