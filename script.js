const STORAGE_KEY = 'agritrade-achats-v1';
const PRIX_PAR_PRODUIT = {
    cacao: 1500,
    hevea: 420
};
const nomsProduits = {
    cacao: 'Cacao',
    hevea: 'Hévéa'
};
const sousVillages = ['Ebikro', 'Yaou', 'Ketesso', 'Bianouan'];
const formatNombre = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
const formatMontant = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

const formulaire = document.getElementById('achat-form');
const messageFormulaire = document.getElementById('form-message');
const champProduit = document.getElementById('produit');
const champVillage = document.getElementById('village');
const champPoids = document.getElementById('poids');
const champMontant = document.getElementById('montant-paye');
const champRecherche = document.getElementById('recherche');
const filtreVillage = document.getElementById('filtre-village');
const listeAchats = document.getElementById('achats-liste');
const messageListeVide = document.getElementById('liste-vide');
const selectionRegistre = document.getElementById('registre-selection');

let achats = chargerAchats();

function formaterMontant(montant) {
    return `${formatMontant.format(montant)} FCFA`;
}

function afficherMessage(message, type) {
    messageFormulaire.textContent = message;
    messageFormulaire.className = `form-message ${type}`;
}

function chargerAchats() {
    try {
        const contenu = localStorage.getItem(STORAGE_KEY);
        if (contenu === null) return [];

        const donnees = JSON.parse(contenu);
        const achatValide = achat => achat
            && typeof achat.id === 'string'
            && typeof achat.nom === 'string'
            && typeof achat.prenom === 'string'
            && typeof achat.telephone === 'string'
            && (achat.village === undefined || typeof achat.village === 'string')
            && Object.prototype.hasOwnProperty.call(PRIX_PAR_PRODUIT, achat.produit)
            && Number.isFinite(achat.poids)
            && achat.poids > 0
            && Number.isFinite(achat.montantPaye)
            && achat.montantPaye >= 0
            && typeof achat.date === 'string';

        if (!Array.isArray(donnees) || !donnees.every(achatValide)) {
            throw new Error('Les données sauvegardées ne sont pas valides.');
        }
        return donnees.map(achat => ({
            ...achat,
            village: achat.village && achat.village.trim() ? achat.village.trim() : 'Village non renseigné'
        }));
    } catch (erreur) {
        afficherMessage(`Impossible de lire les achats sauvegardés : ${erreur.message}`, 'error');
        formulaire.querySelector('button[type="submit"]').disabled = true;
        return [];
    }
}

function sauvegarderAchats() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(achats));
        return true;
    } catch (erreur) {
        afficherMessage(`La sauvegarde a échoué : ${erreur.message}. Vérifiez l'espace disponible du navigateur.`, 'error');
        return false;
    }
}

function mettreAJourMontant() {
    const poids = Number(champPoids.value);
    const prix = PRIX_PAR_PRODUIT[champProduit.value];
    if (Number.isFinite(poids) && poids > 0) {
        champMontant.value = Math.round(poids * prix);
    } else {
        champMontant.value = '';
    }
}

function creerCellule(ligne, contenu) {
    const cellule = document.createElement('td');
    cellule.textContent = contenu;
    ligne.appendChild(cellule);
    return cellule;
}

function cleVillage(village) {
    return village.trim().toLocaleLowerCase('fr');
}

function mettreAJourVillages() {
    const villages = new Map(sousVillages.map(village => [cleVillage(village), village]));
    achats.forEach(achat => {
        const village = achat.village.trim();
        if (village) villages.set(cleVillage(village), village);
    });

    const filtreActuel = filtreVillage.value;
    filtreVillage.replaceChildren(new Option('Tous les villages', ''));
    [...villages.entries()]
        .sort((a, b) => a[1].localeCompare(b[1], 'fr'))
        .forEach(([cle, village]) => {
            filtreVillage.add(new Option(village, cle));
        });

    if ([...filtreVillage.options].some(option => option.value === filtreActuel)) {
        filtreVillage.value = filtreActuel;
    }
}

function afficherAchats() {
    const recherche = champRecherche.value.trim().toLocaleLowerCase('fr');
    const villageChoisi = filtreVillage.value;
    const achatsDuVillage = achats.filter(achat => (
        !villageChoisi || cleVillage(achat.village) === villageChoisi
    ));
    const nomVillageSelectionne = villageChoisi
        ? [...filtreVillage.options].find(option => option.value === villageChoisi).textContent
        : '';
    selectionRegistre.textContent = nomVillageSelectionne
        ? `Registre du village : ${nomVillageSelectionne}`
        : 'Vue générale de la coopérative';
    const achatsFiltres = achats.filter(achat => (
        (!villageChoisi || cleVillage(achat.village) === villageChoisi)
        && `${achat.village} ${achat.nom} ${achat.prenom} ${achat.telephone} ${nomsProduits[achat.produit]}`
            .toLocaleLowerCase('fr')
            .includes(recherche)
    ));

    listeAchats.replaceChildren();
    messageListeVide.hidden = achatsFiltres.length > 0;
    if (achatsDuVillage.length > 0 && achatsFiltres.length === 0) {
        messageListeVide.textContent = 'Aucun résultat pour cette recherche.';
    } else {
        messageListeVide.textContent = villageChoisi
            ? 'Aucun achat enregistré dans ce village pour le moment.'
            : 'Aucun achat enregistré pour le moment.';
    }

    achatsFiltres.forEach(achat => {
        const ligne = document.createElement('tr');
        creerCellule(ligne, new Date(achat.date).toLocaleDateString('fr-FR'));
        creerCellule(ligne, achat.village);
        creerCellule(ligne, `${achat.prenom} ${achat.nom}`);
        creerCellule(ligne, achat.telephone);
        creerCellule(ligne, nomsProduits[achat.produit]);
        creerCellule(ligne, `${formatNombre.format(achat.poids)} kg`);
        creerCellule(ligne, formaterMontant(achat.montantPaye));

        const celluleAction = document.createElement('td');
        const boutonSupprimer = document.createElement('button');
        boutonSupprimer.type = 'button';
        boutonSupprimer.className = 'delete-button';
        boutonSupprimer.setAttribute('aria-label', `Supprimer l'achat de ${achat.prenom} ${achat.nom}`);
        boutonSupprimer.title = 'Supprimer cet achat';
        boutonSupprimer.innerHTML = '<i class="fa-solid fa-trash" aria-hidden="true"></i>';
        boutonSupprimer.addEventListener('click', () => supprimerAchat(achat.id));
        celluleAction.appendChild(boutonSupprimer);
        ligne.appendChild(celluleAction);
        listeAchats.appendChild(ligne);
    });

    mettreAJourStatistiques(achatsDuVillage);
}

function mettreAJourStatistiques(achatsAffiches) {
    const producteurs = new Set(achatsAffiches.map(achat => achat.telephone.replace(/\s+/g, '')));
    const poidsTotal = achatsAffiches.reduce((total, achat) => total + achat.poids, 0);
    const montantTotal = achatsAffiches.reduce((total, achat) => total + achat.montantPaye, 0);

    document.getElementById('stat-producteurs').textContent = formatNombre.format(producteurs.size);
    document.getElementById('stat-poids').textContent = `${formatNombre.format(poidsTotal)} kg`;
    document.getElementById('stat-paye').textContent = formaterMontant(montantTotal);
}

function supprimerAchat(id) {
    const achat = achats.find(element => element.id === id);
    if (!achat || !window.confirm(`Supprimer l'achat de ${achat.prenom} ${achat.nom} ?`)) return;

    const achatsAvantSuppression = achats;
    achats = achats.filter(element => element.id !== id);
    if (!sauvegarderAchats()) {
        achats = achatsAvantSuppression;
        return;
    }
    mettreAJourVillages();
    afficherMessage('Achat supprimé.', 'success');
    afficherAchats();
}

champProduit.addEventListener('change', mettreAJourMontant);
champPoids.addEventListener('input', mettreAJourMontant);
champRecherche.addEventListener('input', afficherAchats);
filtreVillage.addEventListener('change', afficherAchats);

formulaire.addEventListener('submit', event => {
    event.preventDefault();

    const donnees = new FormData(formulaire);
    const village = String(donnees.get('village')).trim();
    const nom = String(donnees.get('nom')).trim();
    const prenom = String(donnees.get('prenom')).trim();
    const telephone = String(donnees.get('telephone')).trim();
    const produit = String(donnees.get('produit'));
    const poids = Number(donnees.get('poids'));
    const montantPaye = Number(donnees.get('montantPaye'));

    if (!village || !nom || !prenom || !telephone || !Object.prototype.hasOwnProperty.call(PRIX_PAR_PRODUIT, produit)
        || !Number.isFinite(poids) || poids <= 0
        || !Number.isFinite(montantPaye) || montantPaye < 0) {
        afficherMessage('Vérifiez les informations saisies et indiquez un poids et un montant valides.', 'error');
        return;
    }

    const nouvelAchat = {
        id: window.crypto && typeof window.crypto.randomUUID === 'function'
            ? window.crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        village,
        nom,
        prenom,
        telephone,
        produit,
        poids,
        montantPaye,
        date: new Date().toISOString()
    };
    achats.unshift(nouvelAchat);

    if (!sauvegarderAchats()) {
        achats.shift();
        return;
    }

    formulaire.reset();
    mettreAJourMontant();
    mettreAJourVillages();
    filtreVillage.value = cleVillage(village);
    champRecherche.value = '';
    afficherMessage('Achat enregistré et sauvegardé sur cet appareil.', 'success');
    afficherAchats();
});

mettreAJourMontant();
mettreAJourVillages();
afficherAchats();
