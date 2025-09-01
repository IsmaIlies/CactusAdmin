// Fonction utilitaire pour calculer les dates de début et fin d'une semaine donnée
// Utilise la norme ISO 8601 : la semaine commence le lundi et la première semaine contient le 4 janvier
export function getWeekDates(
  weekYear: number,
  weekNumber: number
): { startDate: Date; endDate: Date } {
  // Trouver le premier jeudi de l'année (qui définit la première semaine ISO)
  const jan4 = new Date(weekYear, 0, 4);

  // Trouver le lundi de la semaine contenant le 4 janvier
  const firstMonday = new Date(jan4);
  const dayOffset = jan4.getDay() === 0 ? 6 : jan4.getDay() - 1; // Lundi = 0, Dimanche = 6
  firstMonday.setDate(jan4.getDate() - dayOffset);

  // Calculer le lundi de la semaine demandée
  const startDate = new Date(firstMonday);
  startDate.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);

  // Calculer le dimanche de la semaine (fin de semaine)
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  return { startDate, endDate };
}

// Fonction pour calculer le numéro de semaine d'une date
export function getWeekNumber(date: Date): { year: number; week: number } {
  // Clone la date pour éviter de la modifier
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return {
    year: d.getUTCFullYear(),
    week: Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7),
  };
}
