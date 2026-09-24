// Briques génériques pour la future couche KPI, indépendantes du type de données

export function groupBy<T>(items: T[], getKey: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

// Compte par clé, trié du plus fréquent au moins fréquent (ex. écoutes par artiste)
export function countBy<T>(items: T[], getKey: (item: T) => string): [string, number][] {
  return [...groupBy(items, getKey)]
    .map(([key, group]): [string, number] => [key, group.length])
    .sort((a, b) => b[1] - a[1]);
}
