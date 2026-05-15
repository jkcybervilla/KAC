export function filterProjectsByUser(projects, profile) {
  if (!profile) return [];
  if (profile.role === 'admin') return projects;
  const ids = profile.assignedProjectIds || [];
  if (!ids.length) {
    const name = (profile.name || '').toUpperCase();
    return projects.filter((p) => {
      const acc = (p.ACCOUNTANT || '').toUpperCase();
      const coord = (p.CO_ORDINATOR || '').toUpperCase();
      if (profile.role === 'accountant') return acc === name;
      if (profile.role === 'coordinator') return coord === name;
      return false;
    });
  }
  return projects.filter((p) => ids.includes(p.id));
}

export function matchProjectName(projects, projectId) {
  const p = projects.find((x) => x.id === projectId);
  return p?.PROJECT_NAME || '';
}
