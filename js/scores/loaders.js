import { 
  scores_currentCollectionId, scores_currentSchoolId, scores_currentPlatoonId, 
  scores_currentSubjectId, scores_currentSchoolName, scores_allSubjects, scores_students,
  setStudents, setTopics, setScores, setFinal, setAllSubjects
} from './state.js';
import { 
  fetchSchoolsByCollection, fetchPlatoonsByCollection, fetchPlatoonsBySchool,
  fetchParticipantsByCollection, fetchStudentsByPlatoonAndSchool, fetchPeopleBySchool,
  fetchTopicsByCollection, fetchScoresByStudent, fetchFinalScoresByStudent, fetchSubjects
} from './api.js';
import { renderScoresTable } from './ui.js';

export async function loadAllSubjects() {
  if (scores_allSubjects.length) return;
  const subjects = await fetchSubjects();
  setAllSubjects(subjects);
}

export async function loadSchools(collectionId) {
  return await fetchSchoolsByCollection(collectionId);
}

export async function loadPlatoonsBySchool(schoolId) {
  return await fetchPlatoonsBySchool(schoolId);
}

export async function loadPlatoonsByCollection(collectionId) {
  return await fetchPlatoonsByCollection(collectionId);
}

export async function loadStudentsByCurrentFilter() {
  if (!scores_currentCollectionId) return;
  if (scores_currentSchoolId === null) {
    const participants = await fetchParticipantsByCollection(scores_currentCollectionId);
    let filtered = participants;
    if (scores_currentPlatoonId) {
      filtered = participants.filter(p => p.platoon_id === scores_currentPlatoonId);
    }
    const mapped = filtered.map(p => ({
      id: p.id,
      full_name: p.full_name,
      school_name: p.school_name || p.organization,
      organization: p.organization
    }));
    setStudents(mapped);
  } else {
    let students = [];
    if (scores_currentPlatoonId) {
      students = await fetchStudentsByPlatoonAndSchool(scores_currentPlatoonId, scores_currentSchoolId);
    } else {
      students = await fetchPeopleBySchool(scores_currentSchoolId);
    }
    const mapped = students.map(s => ({
      id: s.id,
      full_name: s.full_name,
      school_name: scores_currentSchoolName,
      organization: s.organization || scores_currentSchoolName
    }));
    setStudents(mapped);
  }
}

export async function loadTopicsForSubject() {
  if (!scores_currentCollectionId || !scores_currentSubjectId) return;
  const data = await fetchTopicsByCollection(scores_currentCollectionId);
  const filtered = data.topics.filter(t => t.subject_id == scores_currentSubjectId);
  setTopics(filtered);
}

export async function loadScoresForStudents() {
  const newScores = {};
  for (const s of scores_students) {
    const sc = await fetchScoresByStudent(s.id);
    newScores[s.id] = sc;
  }
  setScores(newScores);
}

export async function loadFinalScoresForStudents() {
  const newFinal = {};
  for (const s of scores_students) {
    const fin = await fetchFinalScoresByStudent(s.id);
    newFinal[s.id] = fin;
  }
  setFinal(newFinal);
}

export async function loadTopicsOrFinalForDisplay() {
  if (scores_currentSubjectId === 'all') {
    await loadFinalScoresForStudents();
    renderScoresTable();
  } else {
    await loadTopicsForSubject();
    await loadScoresForStudents();
    renderScoresTable();
  }
}