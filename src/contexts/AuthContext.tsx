import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  updatePassword,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { doc, setDoc, getFirestore } from "firebase/firestore";

interface User {
  id: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  role?: string;
  assignedMissions?: string[];
  missions?: { name: string; role: string }[];
  customClaims?: {
    admin?: boolean;
    direction?: boolean;
    superviseur?: boolean;
    ta?: boolean;
    missions?: string[];
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean; // <-- ajoute cette ligne
  login: (email: string, password: string) => Promise<boolean>;
  loginWithMicrosoft: () => Promise<boolean>;
  logout: () => void;
  updateUserEmail: (
    newEmail: string,
    currentPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateUserDisplayName: (displayName: string) => Promise<boolean>;
  updateUserProfile: (firstName: string, lastName: string) => Promise<boolean>;
  updateUserPassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  sendVerificationEmail: () => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  reloadUser: () => Promise<void>;
  refreshUserClaims: () => Promise<void>;
  isAdmin: () => boolean;
  isDirection: () => boolean;
  isSuperviseur: () => boolean;
  isTA: () => boolean;
  hasRole: (role: string) => boolean;
  canManageUsers: () => boolean;
  canAccessMission: (missionId: string) => boolean;
  debugUserRoles: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Récupérer les custom claims depuis le token ID
          const idTokenResult = await firebaseUser.getIdTokenResult();
          const customClaims = idTokenResult.claims as any;

          setUser({
            id: firebaseUser.uid,
            displayName: firebaseUser.displayName || "",
            email: firebaseUser.email || "",
            emailVerified: firebaseUser.emailVerified,
            role: (customClaims.role as string) || undefined,
            assignedMissions: (customClaims.missions as string[]) || [],
            missions: (customClaims.missions as { name: string; role: string }[]) || [],
            customClaims: {
              admin: (customClaims.admin as boolean) || false,
              direction: (customClaims.direction as boolean) || false,
              superviseur: (customClaims.superviseur as boolean) || false,
              ta: (customClaims.ta as boolean) || false,
              missions: (customClaims.missions as string[]) || [],
            },
          });
        } catch (error) {
          console.error("Erreur lors de la récupération des claims:", error);
          // En cas d'erreur, créer un utilisateur sans rôles spéciaux
          setUser({
            id: firebaseUser.uid,
            displayName: firebaseUser.displayName || "",
            email: firebaseUser.email || "",
            emailVerified: firebaseUser.emailVerified,
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Ajouter automatiquement "@mars-marketing.fr" si pas de "@" dans l'email
      const formattedEmail = email.includes("@")
        ? email
        : `${email}@mars-marketing.fr`;

      const userCredential = await signInWithEmailAndPassword(
        auth,
        formattedEmail,
        password
      );
      const user = userCredential.user;

      try {
        // Récupérer les custom claims
        const idTokenResult = await user.getIdTokenResult();
        const customClaims = idTokenResult.claims as any;

        setUser({
          id: user.uid,
          displayName: user.displayName || "",
          email: user.email || "",
          emailVerified: user.emailVerified,
          role: (customClaims.role as string) || undefined,
          assignedMissions: (customClaims.missions as string[]) || [],
          missions: (customClaims.missions as { name: string; role: string }[]) || [],
          customClaims: {
            admin: (customClaims.admin as boolean) || false,
            direction: (customClaims.direction as boolean) || false,
            superviseur: (customClaims.superviseur as boolean) || false,
            ta: (customClaims.ta as boolean) || false,
            missions: (customClaims.missions as string[]) || [],
          },
        });
      } catch (claimsError) {
        console.error(
          "Erreur lors de la récupération des claims:",
          claimsError
        );
        // En cas d'erreur, créer un utilisateur sans rôles spéciaux
        setUser({
          id: user.uid,
          displayName: user.displayName || "",
          email: user.email || "",
          emailVerified: user.emailVerified,
        });
      }

      return true;
    } catch (error) {
      console.error("Erreur login", error);
      return false;
    }
  };

  const loginWithMicrosoft = async (): Promise<boolean> => {
    return false;
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Erreur logout", error);
    }
  };

  const updateUserEmail = async (
    newEmail: string,
    currentPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!auth.currentUser)
      return { success: false, error: "Aucun utilisateur connecté" };

    try {
      // Ré-authentifier l'utilisateur
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email!,
        currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Utiliser verifyBeforeUpdateEmail au lieu de updateEmail directement
      // Cette méthode envoie un email de vérification à la nouvelle adresse
      // et ne change l'email qu'après vérification
      await verifyBeforeUpdateEmail(auth.currentUser, newEmail);

      return { success: true };
    } catch (error: any) {
      console.error("Erreur mise à jour email:", error);

      let errorMessage = "Erreur lors de la mise à jour de l'email";
      switch (error.code) {
        case "auth/operation-not-allowed":
          errorMessage =
            "Cette opération n'est pas autorisée. Veuillez contacter le support.";
          break;
        case "auth/wrong-password":
          errorMessage = "Mot de passe incorrect";
          break;
        case "auth/email-already-in-use":
          errorMessage = "Cette adresse email est déjà utilisée";
          break;
        case "auth/invalid-email":
          errorMessage = "Adresse email invalide";
          break;
        case "auth/too-many-requests":
          errorMessage = "Trop de tentatives. Veuillez réessayer plus tard";
          break;
        case "auth/requires-recent-login":
          errorMessage =
            "Veuillez vous reconnecter pour effectuer cette action";
          break;
      }

      return { success: false, error: errorMessage };
    }
  };

  const updateUserDisplayName = async (
    displayName: string
  ): Promise<boolean> => {
    if (!auth.currentUser) return false;

    try {
      // Mettre à jour dans Firebase Auth
      await updateProfile(auth.currentUser, { displayName });

      // Mettre à jour dans Firestore (créer le document s'il n'existe pas)
      const db = getFirestore();
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(userDocRef, { displayName }, { merge: true });

      // Mettre à jour l'état local
      setUser((prev) => (prev ? { ...prev, displayName } : null));

      return true;
    } catch (error) {
      console.error("Erreur mise à jour displayName:", error);
      return false;
    }
  };

  const updateUserProfile = async (
    firstName: string,
    lastName: string
  ): Promise<boolean> => {
    if (!auth.currentUser) return false;

    try {
      // Mettre à jour dans Firestore
      const db = getFirestore();
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(userDocRef, { firstName, lastName }, { merge: true });

      return true;
    } catch (error) {
      console.error("Erreur mise à jour profil:", error);
      return false;
    }
  };

  const sendVerificationEmail = async (): Promise<boolean> => {
    if (!auth.currentUser) return false;

    try {
      await sendEmailVerification(auth.currentUser);
      return true;
    } catch (error) {
      console.error("Erreur envoi email de vérification:", error);
      return false;
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      // Ajouter automatiquement "@mars-marketing.fr" si pas de "@" dans l'email
      const formattedEmail = email.includes("@")
        ? email
        : `${email}@mars-marketing.fr`;

      await sendPasswordResetEmail(auth, formattedEmail);
      return true;
    } catch (error) {
      console.error("Erreur envoi email de réinitialisation:", error);
      return false;
    }
  };

  const reloadUser = async (): Promise<void> => {
    if (!auth.currentUser) return;

    try {
      await auth.currentUser.reload();
      console.log(
        "Utilisateur rechargé manuellement, emailVerified:",
        auth.currentUser.emailVerified
      );

      // Récupérer les custom claims mis à jour
      const idTokenResult = await auth.currentUser.getIdTokenResult(true); // Force refresh
      const customClaims = idTokenResult.claims as any;

      // Forcer la mise à jour du contexte avec les claims
      setUser({
        id: auth.currentUser.uid,
        displayName: auth.currentUser.displayName || "",
        email: auth.currentUser.email || "",
        emailVerified: auth.currentUser.emailVerified,
        role: (customClaims.role as string) || undefined,
        assignedMissions: (customClaims.missions as string[]) || [],
        missions: (customClaims.missions as { name: string; role: string }[]) || [],
        customClaims: {
          admin: (customClaims.admin as boolean) || false,
          direction: (customClaims.direction as boolean) || false,
          superviseur: (customClaims.superviseur as boolean) || false,
          ta: (customClaims.ta as boolean) || false,
          missions: (customClaims.missions as string[]) || [],
        },
      });
    } catch (error) {
      console.error("Erreur lors du rechargement de l'utilisateur:", error);
    }
  };

  const updateUserPassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!auth.currentUser)
      return { success: false, error: "Aucun utilisateur connecté" };

    try {
      // Ré-authentifier l'utilisateur
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email!,
        currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Mettre à jour le mot de passe
      await updatePassword(auth.currentUser, newPassword);

      return { success: true };
    } catch (error: any) {
      console.error("Erreur mise à jour mot de passe:", error);

      let errorMessage = "Erreur lors de la mise à jour du mot de passe";
      switch (error.code) {
        case "auth/wrong-password":
          errorMessage = "Mot de passe actuel incorrect";
          break;
        case "auth/weak-password":
          errorMessage = "Le nouveau mot de passe est trop faible";
          break;
        case "auth/too-many-requests":
          errorMessage = "Trop de tentatives. Veuillez réessayer plus tard";
          break;
        case "auth/requires-recent-login":
          errorMessage =
            "Veuillez vous reconnecter pour effectuer cette action";
          break;
      }

      return { success: false, error: errorMessage };
    }
  };

  // Fonctions de vérification des rôles
  const isAdmin = (): boolean => {
    return user?.customClaims?.admin === true || user?.role === "admin";
  };

  const isDirection = (): boolean => {
    return user?.customClaims?.direction === true || user?.role === "direction";
  };

  const isSuperviseur = (): boolean => {
    return (
      user?.customClaims?.superviseur === true || user?.role === "superviseur"
    );
  };

  const isTA = (): boolean => {
    return user?.customClaims?.ta === true || user?.role === "ta";
  };

  const hasRole = (role: string): boolean => {
    return (
      user?.role === role ||
      user?.customClaims?.[role as keyof typeof user.customClaims] === true
    );
  };

  // Vérifier si l'utilisateur peut gérer les utilisateurs (admin seulement)
  const canManageUsers = (): boolean => {
    return isAdmin();
  };

  // Vérifier si l'utilisateur peut accéder à une mission spécifique
  const canAccessMission = (missionId: string): boolean => {
    // Admin et Direction ont accès à toutes les missions
    if (isAdmin() || isDirection()) {
      return true;
    }

    // Superviseurs et TAs ont accès seulement aux missions assignées
    if (isSuperviseur() || isTA()) {
      return (
        user?.assignedMissions?.includes(missionId) === true ||
        user?.customClaims?.missions?.includes(missionId) === true
      );
    }

    return false;
  };

  // Fonction de debug pour vérifier les rôles
  const debugUserRoles = (): void => {
    if (user) {
      console.log("=== DEBUG ROLES ===");
      console.log("User:", user.email);
      console.log("Role:", user.role);
      console.log("Custom Claims:", user.customClaims);
      console.log("Assigned Missions:", user.assignedMissions);
      console.log("isAdmin():", isAdmin());
      console.log("isDirection():", isDirection());
      console.log("isSuperviseur():", isSuperviseur());
      console.log("isTA():", isTA());
      console.log("canManageUsers():", canManageUsers());
      console.log("=================");
    } else {
      console.log("Aucun utilisateur connecté");
    }
  };

  const refreshUserClaims = async (): Promise<void> => {
    if (!auth.currentUser) return;

    try {
      // Forcer le rechargement du token pour récupérer les nouveaux custom claims
      await auth.currentUser.getIdToken(true); // true = force refresh

      // Récupérer les nouveaux custom claims
      const idTokenResult = await auth.currentUser.getIdTokenResult();
      const customClaims = idTokenResult.claims as any;

      // Mettre à jour l'état utilisateur avec les nouveaux claims
      setUser({
        id: auth.currentUser.uid,
        displayName: auth.currentUser.displayName || "",
        email: auth.currentUser.email || "",
        emailVerified: auth.currentUser.emailVerified,
        role: (customClaims.role as string) || undefined,
        assignedMissions: (customClaims.missions as string[]) || [],
        missions: (customClaims.missions as { name: string; role: string }[]) || [],
        customClaims: {
          admin: (customClaims.admin as boolean) || false,
          direction: (customClaims.direction as boolean) || false,
          superviseur: (customClaims.superviseur as boolean) || false,
          ta: (customClaims.ta as boolean) || false,
          missions: (customClaims.missions as string[]) || [],
        },
      });

      console.log("Custom claims rafraîchis avec succès");
    } catch (error) {
      console.error(
        "Erreur lors du rafraîchissement des custom claims:",
        error
      );
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    loginWithMicrosoft,
    logout,
    updateUserEmail,
    updateUserDisplayName,
    updateUserProfile,
    updateUserPassword,
    sendVerificationEmail,
    resetPassword,
    reloadUser,
    refreshUserClaims,
    isAdmin,
    isDirection,
    isSuperviseur,
    isTA,
    hasRole,
    canManageUsers,
    canAccessMission,
    debugUserRoles,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
