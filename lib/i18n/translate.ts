// Remplace les {{placeholders}} d'une chaîne traduite par des valeurs
// concrètes (ex: "Calculé sur {{count}}/{{total}} articles" ->
// "Calculé sur 5/10 articles") — plus simple qu'une fonction par clé, et ça
// marche pareil dans les 3 langues puisque seule la CHAÎNE change, pas la
// logique de remplacement.
export function interpolate(
  template: string,
  vars?: Record<string, string | number>
): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = vars[key];
    return value !== undefined ? String(value) : match;
  });
}
