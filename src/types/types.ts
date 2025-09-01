// types.ts

// Types pour la gestion des rôles avancés
export type UserRole = "admin" | "direction" | "superviseur" | "ta";

export interface Mission {
  id: string;
  name: string;
  description: string;
}

export interface UserWithRole {
  id: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  role?: UserRole;
  assignedMissions?: string[]; // IDs des missions assignées pour superviseurs et TAs
  customClaims?: {
    admin?: boolean;
    direction?: boolean;
    superviseur?: boolean;
    ta?: boolean;
    missions?: string[]; // Missions assignées stockées dans les claims
  };
}

export type Message = {
  from: "IA" | "Client";
  text: string;
};

export interface CallData {
  clientInfo: {
    hasChildren: boolean;
    hasTeens: boolean;
  };
  preferences: {
    genres: string[];
    sports: string[];
    watchingFrequency: string;
    deviceUsage?: string;
    favoriteFilm?: string;
    favoriteActor?: string;
    favoriteSeries?: string;
    favoriteFilmGenres?: string[];
    favoriteSeriesGenres?: string[];
  };
  notes: string;
  offerScript?: string;
  messages?: Message[];
  objections?: string[];
}
