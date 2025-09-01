import { getFunctions, httpsCallable } from "firebase/functions";

export interface FirebaseUser {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  disabled: boolean;
  role: string;
  customClaims: any;
  creationTime: string;
  lastSignInTime: string;
  firstName?: string;
  lastName?: string;
}

export interface UserUpdateData {
  displayName?: string;
  firstName?: string;
  lastName?: string;
}

export interface UserRole {
  value: string;
  label: string;
}

export const USER_ROLES: UserRole[] = [
  { value: "admin", label: "Administrateur" },
  { value: "direction", label: "Direction" },
  { value: "superviseur", label: "Superviseur" },
  { value: "ta", label: "TA" },
  { value: "user", label: "Utilisateur" },
];

class UserService {
  private functions = getFunctions(undefined, "europe-west9");
  private listUsersFunction = httpsCallable(this.functions, "listUsers");
  private setUserRoleFunction = httpsCallable(this.functions, "setUserRole");
  private deleteUserFunction = httpsCallable(this.functions, "deleteUser");
  private sendPasswordResetFunction = httpsCallable(
    this.functions,
    "sendPasswordReset"
  );
  private sendEmailVerificationFunction = httpsCallable(
    this.functions,
    "sendEmailVerification"
  );
  private updateUserFunction = httpsCallable(this.functions, "updateUser");

  /**
   * Récupère la liste de tous les utilisateurs
   */
  async getUsers(): Promise<FirebaseUser[]> {
    try {
      console.log("Tentative de chargement des utilisateurs...");

      const result = await this.listUsersFunction();
      console.log("Résultat brut:", result);

      const data = result.data as { users: FirebaseUser[]; success: boolean };
      console.log("Données parsées:", data);

      if (data.success) {
        console.log("Utilisateurs chargés:", data.users.length);
        return data.users;
      } else {
        throw new Error("Erreur lors du chargement des utilisateurs");
      }
    } catch (error: any) {
      console.error("Erreur détaillée:", error);
      console.error("Code erreur:", error.code);
      console.error("Message erreur:", error.message);
      console.error("Details erreur:", error.details);
      throw new Error(
        `Erreur: ${error.message || error.code || "Erreur inconnue"}`
      );
    }
  }

  /**
   * Modifie le rôle d'un utilisateur
   */
  async updateUserRole(userId: string, newRole: string): Promise<string> {
    try {
      console.log(`Modification du rôle pour ${userId} vers ${newRole}`);

      const result = await this.setUserRoleFunction({
        targetUserId: userId,
        role: newRole,
      });
      console.log("Résultat modification rôle:", result);

      const data = result.data as { success: boolean; message: string };

      if (data.success) {
        console.log("Rôle modifié avec succès");
        return data.message;
      } else {
        throw new Error("Erreur lors de la modification du rôle");
      }
    } catch (error: any) {
      console.error("Erreur modification rôle:", error);
      throw new Error(
        `Erreur: ${error.message || error.code || "Erreur inconnue"}`
      );
    }
  }

  /**
   * Supprime un utilisateur
   */
  async deleteUser(userId: string): Promise<string> {
    try {
      console.log(`Suppression de l'utilisateur ${userId}`);

      const result = await this.deleteUserFunction({
        targetUserId: userId,
      });
      console.log("Résultat suppression:", result);

      const data = result.data as { success: boolean; message: string };

      if (data.success) {
        console.log("Utilisateur supprimé avec succès");
        return data.message;
      } else {
        throw new Error("Erreur lors de la suppression de l'utilisateur");
      }
    } catch (error: any) {
      console.error("Erreur suppression utilisateur:", error);
      throw new Error(
        `Erreur: ${error.message || error.code || "Erreur inconnue"}`
      );
    }
  }

  /**
   * Envoie un email de réinitialisation de mot de passe
   */
  async sendPasswordReset(email: string): Promise<string> {
    try {
      console.log(`Envoi de réinitialisation de mot de passe pour ${email}`);

      const result = await this.sendPasswordResetFunction({
        email: email,
      });
      console.log("Résultat envoi reset:", result);

      const data = result.data as { success: boolean; message: string };

      if (data.success) {
        console.log("Email de réinitialisation envoyé avec succès");
        return data.message;
      } else {
        throw new Error(
          "Erreur lors de l'envoi de l'email de réinitialisation"
        );
      }
    } catch (error: any) {
      console.error("Erreur envoi reset:", error);
      throw new Error(
        `Erreur: ${error.message || error.code || "Erreur inconnue"}`
      );
    }
  }

  /**
   * Envoie un email de vérification
   */
  async sendEmailVerification(userId: string): Promise<string> {
    try {
      console.log(`Envoi de vérification d'email pour ${userId}`);

      const result = await this.sendEmailVerificationFunction({
        targetUserId: userId,
      });
      console.log("Résultat envoi vérification:", result);

      const data = result.data as { success: boolean; message: string };

      if (data.success) {
        console.log("Email de vérification envoyé avec succès");
        return data.message;
      } else {
        throw new Error("Erreur lors de l'envoi de l'email de vérification");
      }
    } catch (error: any) {
      console.error("Erreur envoi vérification:", error);
      throw new Error(
        `Erreur: ${error.message || error.code || "Erreur inconnue"}`
      );
    }
  }

  /**
   * Met à jour les informations d'un utilisateur
   */
  async updateUser(
    userId: string,
    updateData: UserUpdateData
  ): Promise<string> {
    try {
      console.log(`Mise à jour de l'utilisateur ${userId}`, updateData);

      const result = await this.updateUserFunction({
        targetUserId: userId,
        updateData: updateData,
      });
      console.log("Résultat mise à jour:", result);

      const data = result.data as { success: boolean; message: string };

      if (data.success) {
        console.log("Utilisateur mis à jour avec succès");
        return data.message;
      } else {
        throw new Error("Erreur lors de la mise à jour de l'utilisateur");
      }
    } catch (error: any) {
      console.error("Erreur mise à jour utilisateur:", error);
      throw new Error(
        `Erreur: ${error.message || error.code || "Erreur inconnue"}`
      );
    }
  }

  /**
   * Retourne la couleur du badge pour un rôle donné
   */
  getRoleBadgeColor(role: string): string {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "direction":
        return "bg-purple-100 text-purple-800";
      case "superviseur":
        return "bg-blue-100 text-blue-800";
      case "ta":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  /**
   * Retourne le label d'un rôle
   */
  getRoleLabel(role: string): string {
    const roleObj = USER_ROLES.find((r) => r.value === role);
    return roleObj?.label || role;
  }

  /**
   * Vérifie si un rôle est valide
   */
  isValidRole(role: string): boolean {
    return USER_ROLES.some((r) => r.value === role);
  }
}

// Export d'une instance singleton
export const userService = new UserService();
export default userService;
