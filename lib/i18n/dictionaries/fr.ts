// Dictionnaire de référence (français) — toute nouvelle clé doit être créée
// ici en premier, puis reportée dans en.ts et es.ts. Les clés manquantes
// dans en.ts/es.ts retombent automatiquement sur le français (voir
// lib/i18n/LanguageContext.tsx) plutôt que de planter ou d'afficher une clé
// brute à l'écran.
//
// Organisation : un espace de noms par écran/composant ("profileForm.",
// "resultsContent.", ...), plus "common." pour ce qui est réutilisé partout
// (boutons génériques, etc.).
const fr = {
  // Commun à toute l'app
  "common.next": "Suivant",
  "common.back": "Retour",
  "common.close": "Fermer",
  "common.cancel": "Annuler",
  "common.save": "Enregistrer",
  "common.confirm": "Confirmer",
  "common.loading": "Chargement...",
  "common.error": "Une erreur est survenue.",
  "common.appName": "CampusPanier",

  // Réglages (app/parametres/page.tsx)
  "settings.backToApp": "← Retour à l'app",
  "settings.title": "Réglages",
  "settings.connectedAs": "Connecté·e en tant que {{email}}",
  "settings.appearanceTitle": "Apparence",
  "settings.themeLabel": "Thème",
  "settings.themeLight": "Clair",
  "settings.themeDark": "Sombre",
  "settings.themeSystem": "Système",
  "settings.languageLabel": "Langue",
  "settings.legalTitle": "Documents légaux",
  "settings.legalMentions": "Mentions légales",
  "settings.legalCgu": "Conditions générales d'utilisation",
  "settings.legalPrivacy": "Politique de confidentialité",
  "settings.legalCookies": "Cookies et traceurs",
  "settings.dataTitle": "Mes données",
  "settings.clearHistoryLabel": "Vider l'historique de mes listes",
  "settings.clearHistoryConfirm": "Effacer tout l'historique de tes listes de courses passées ? Cette action est irréversible.",
  "settings.clearHistoryDone": "Historique effacé.",
  "settings.exportDataLabel": "Exporter mes données (RGPD)",
  "settings.exportDataHint": "Télécharge une copie de ton profil, tes favoris et ton historique au format JSON.",
  "settings.deleteAccountTitle": "Supprimer mon compte",
  "settings.deleteAccountWarning": "Cette action supprime définitivement : ton profil (régime, allergies, calories, poids/taille/âge...), ton compte de connexion Google associé à CampusPanier, et toutes les données enregistrées uniquement sur cet appareil (favoris, historique, recettes vues). Si tu es membre d'une liste partagée, ton nom en est retiré mais la liste reste visible aux autres colocataires. Cette action est irréversible.",
  "settings.deleteAccountConfirmLabel": "Tape {{word}} pour confirmer",
  "settings.deleteAccountButton": "Supprimer définitivement mon compte",
  "settings.deleteAccountInProgress": "Suppression en cours...",
  "settings.deleteAccountReauthMessage": "Pour des raisons de sécurité, Google demande une connexion récente avant de supprimer le compte. Déconnecte-toi puis reconnecte-toi, ensuite reviens ici pour réessayer.",
  "settings.deleteAccountGenericError": "La suppression a échoué. Réessaie, ou contacte le support si le problème persiste.",
  "settings.reauthSignOutButton": "Se déconnecter pour réessayer ensuite",
} as const;

export default fr;
