export function getDisplayName(user) {
  return [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;
}

export function getInitials(user) {
  return [user.first_name?.[0], user.last_name?.[0]].filter(Boolean).join('').toUpperCase() || user.email?.[0]?.toUpperCase();
}
