/** Calibration feedback tied to the exact assessment the player saw. */
export function skillFeedbackKey(report){return JSON.stringify([report.version,report.history_key,report.model_sha??null]);}
export function currentSkillFeedback(journey){return journey?.skill?(journey.skill_feedback??[]).find(f=>f.key===skillFeedbackKey(journey.skill)):undefined;}
export function validSkillFeedback(f){return f&&typeof f.key==='string'&&['too_harsh','too_generous'].includes(f.rating)&&typeof f.note==='string'&&Number.isFinite(f.score)&&f.assessment&&typeof f.assessment.version==='string';}
