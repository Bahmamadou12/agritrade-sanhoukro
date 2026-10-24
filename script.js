const STORAGE_KEY = 'agritrade-achats-v1';
const TARIFS_STORAGE_KEY = 'agritrade-tarifs-v1';
const tarifsInitials = chargerTarifs();
const PRIX_PAR_PRODUIT = tarifsInitials.prix;
let dateInitialeDesTarifs = tarifsInitials.date;
const NOMS_PRODUITS = { cacao: 'Cacao', hevea: 'Hévéa' };
const SOUS_VILLAGES = ['Ebikro', 'Yaou', 'Ketesso', 'Bianouan'];
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
const filtreProduit = document.getElementById('filtre-produit');
const dateDebut = document.getElementById('date-debut');
const dateFin = document.getElementById('date-fin');
const listeAchats = document.getElementById('achats-liste');
const messageListeVide = document.getElementById('liste-vide');
const selectionRegistre = document.getElementById('registre-selection');
const listeOperations = document.getElementById('dernieres-operations');
const detailsDialog = document.getElementById('details-dialog');
const detailsAchat = document.getElementById('details-achat');
const boutonSoumission = document.getElementById('submit-achat');
const boutonAnnulerModification = document.getElementById('annuler-modification');

let achats = chargerAchats();
let idEnModification = null;
let achatEnCoursDeRecu = null;

function chargerTarifs() {
    const tarifsParDefaut = { prix: { cacao: 1500, hevea: 420 }, date: '' };
    try {
        const contenu = localStorage.getItem(TARIFS_STORAGE_KEY);
        if (!contenu) return tarifsParDefaut;
        const donnees = JSON.parse(contenu);
        const dateValide = typeof donnees?.date === 'string'
            && /^\d{4}-\d{2}-\d{2}$/.test(donnees.date)
            && new Date(`${donnees.date}T00:00:00`).toISOString().slice(0, 10) === donnees.date;
        if (!donnees || !donnees.prix
            || !Number.isSafeInteger(donnees.prix.cacao) || donnees.prix.cacao <= 0
            || !Number.isSafeInteger(donnees.prix.hevea) || donnees.prix.hevea <= 0
            || (donnees.date !== '' && !dateValide)) {
            throw new Error('Les tarifs sauvegardés ne sont pas valides.');
        }
        return donnees;
    } catch (erreur) {
        afficherMessageTarifs(`Impossible de lire les tarifs sauvegardés : ${erreur.message}`, 'error');
        return tarifsParDefaut;
    }
}

function afficherMessageTarifs(message, type) {
    const messageTarifs = document.getElementById('tarifs-message');
    if (!messageTarifs) return;
    messageTarifs.textContent = message;
    messageTarifs.className = `form-message ${type}`;
}

function afficherTarifs() {
    document.getElementById('prix-cacao').textContent = formatMontant.format(PRIX_PAR_PRODUIT.cacao);
    document.getElementById('prix-hevea').textContent = formatMontant.format(PRIX_PAR_PRODUIT.hevea);
    document.getElementById('prix-cacao-saisie').value = PRIX_PAR_PRODUIT.cacao;
    document.getElementById('prix-hevea-saisie').value = PRIX_PAR_PRODUIT.hevea;
    document.getElementById('date-prix').textContent = dateInitialeDesTarifs
        ? new Date(`${dateInitialeDesTarifs}T00:00:00`).toLocaleDateString('fr-FR')
        : 'Non renseignée';
    document.getElementById('date-prix-saisie').value = dateInitialeDesTarifs;
}

function formaterMontant(montant) {
    return `${formatMontant.format(montant)} FCFA`;
}

function afficherMessage(message, type) {
    messageFormulaire.textContent = message;
    messageFormulaire.className = `form-message ${type}`;
}

function achatValide(achat) {
    return achat
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
}

function chargerAchats() {
    try {
        const contenu = localStorage.getItem(STORAGE_KEY);
        if (contenu === null) return [];

        const donnees = JSON.parse(contenu);
        if (!Array.isArray(donnees) || !donnees.every(achatValide)) {
            throw new Error('Les données sauvegardées ne sont pas valides.');
        }
        return donnees.map(achat => ({
            ...achat,
            village: achat.village && achat.village.trim() ? achat.village.trim() : 'Village non renseigné'
        }));
    } catch (erreur) {
        afficherMessage(`Impossible de lire les achats sauvegardés : ${erreur.message}`, 'error');
        boutonSoumission.disabled = true;
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

function cleVillage(village) {
    return village.trim().toLocaleLowerCase('fr');
}

function mettreAJourMontant() {
    const poids = Number(champPoids.value);
    const prix = PRIX_PAR_PRODUIT[champProduit.value];
    champMontant.value = Number.isFinite(poids) && poids > 0
        ? Math.round(poids * prix)
        : '';
    afficherRecapitulatif();
}

function afficherRecapitulatif() {
    const recap = document.getElementById('recapitulatif-achat');
    const poids = Number(champPoids.value);
    const montant = Number(champMontant.value);
    if (!Number.isFinite(poids) || poids <= 0 || !Number.isFinite(montant) || montant < 0) {
        recap.textContent = 'Le montant estimé s’affichera après la saisie du poids.';
        return;
    }
    recap.textContent = `Récapitulatif : ${formatNombre.format(poids)} kg de ${NOMS_PRODUITS[champProduit.value]} — ${formaterMontant(montant)}.`;
}

function creerCellule(ligne, contenu) {
    const cellule = document.createElement('td');
    cellule.textContent = contenu;
    ligne.appendChild(cellule);
    return cellule;
}

function creerBoutonAction(texte, icone, classe, action) {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = `table-action ${classe}`;
    bouton.setAttribute('aria-label', texte);
    bouton.title = texte;
    bouton.innerHTML = `<i class="fa-solid ${icone}" aria-hidden="true"></i>`;
    bouton.addEventListener('click', action);
    return bouton;
}

function mettreAJourVillages() {
    const villages = new Map(SOUS_VILLAGES.map(village => [cleVillage(village), village]));
    achats.forEach(achat => {
        const village = achat.village.trim();
        if (village) villages.set(cleVillage(village), village);
    });

    const filtreActuel = filtreVillage.value;
    filtreVillage.replaceChildren(new Option('Tous les villages', ''));
    [...villages.entries()]
        .sort((a, b) => a[1].localeCompare(b[1], 'fr'))
        .forEach(([cle, village]) => filtreVillage.add(new Option(village, cle)));

    if ([...filtreVillage.options].some(option => option.value === filtreActuel)) {
        filtreVillage.value = filtreActuel;
    }
}

function achatsFiltres() {
    const recherche = champRecherche.value.trim().toLocaleLowerCase('fr');
    const village = filtreVillage.value;
    const produit = filtreProduit.value;
    const debut = dateDebut.value;
    const fin = dateFin.value;

    return achats.filter(achat => {
        const date = achat.date.slice(0, 10);
        const texte = `${achat.village} ${achat.nom} ${achat.prenom} ${achat.telephone} ${NOMS_PRODUITS[achat.produit]}`
            .toLocaleLowerCase('fr');
        return (!village || cleVillage(achat.village) === village)
            && (!produit || achat.produit === produit)
            && (!debut || date >= debut)
            && (!fin || date <= fin)
            && texte.includes(recherche);
    });
}

function afficherDetails(achat) {
    detailsAchat.replaceChildren();
    const champs = [
        ['Date', new Date(achat.date).toLocaleString('fr-FR')],
        ['Village', achat.village],
        ['Producteur', `${achat.prenom} ${achat.nom}`],
        ['Téléphone', achat.telephone],
        ['Produit', NOMS_PRODUITS[achat.produit]],
        ['Poids', `${formatNombre.format(achat.poids)} kg`],
        ['Montant payé', formaterMontant(achat.montantPaye)]
    ];
    champs.forEach(([titre, valeur]) => {
        const terme = document.createElement('dt');
        const definition = document.createElement('dd');
        terme.textContent = titre;
        definition.textContent = valeur;
        detailsAchat.append(terme, definition);
    });
    achatEnCoursDeRecu = achat;
    detailsDialog.showModal();
}

function afficherDernieresOperations(liste) {
    listeOperations.replaceChildren();
    if (liste.length === 0) {
        const vide = document.createElement('p');
        vide.className = 'empty-state';
        vide.textContent = 'Aucune opération récente dans ce registre.';
        listeOperations.appendChild(vide);
        return;
    }

    liste.slice(0, 5).forEach(achat => {
        const ligne = document.createElement('div');
        ligne.className = 'recent-item';
        const nom = document.createElement('strong');
        const details = document.createElement('span');
        const total = document.createElement('strong');
        nom.textContent = `${achat.prenom} ${achat.nom}`;
        details.textContent = `${achat.village} · ${NOMS_PRODUITS[achat.produit]} · ${formatNombre.format(achat.poids)} kg · ${new Date(achat.date).toLocaleDateString('fr-FR')}`;
        total.textContent = formaterMontant(achat.montantPaye);
        ligne.append(nom, details, total);
        listeOperations.appendChild(ligne);
    });
}

function mettreAJourStatistiques(liste) {
    const producteurs = new Set(liste.map(achat => achat.telephone.replace(/\s+/g, '')));
    const poidsTotal = liste.reduce((total, achat) => total + achat.poids, 0);
    const montantTotal = liste.reduce((total, achat) => total + achat.montantPaye, 0);
    const poidsCacao = liste.filter(achat => achat.produit === 'cacao')
        .reduce((total, achat) => total + achat.poids, 0);
    const poidsHevea = liste.filter(achat => achat.produit === 'hevea')
        .reduce((total, achat) => total + achat.poids, 0);

    document.getElementById('stat-producteurs').textContent = formatNombre.format(producteurs.size);
    document.getElementById('stat-poids').textContent = `${formatNombre.format(poidsTotal)} kg`;
    document.getElementById('stat-paye').textContent = formaterMontant(montantTotal);
    document.getElementById('stat-cacao').textContent = `${formatNombre.format(poidsCacao)} kg`;
    document.getElementById('stat-hevea').textContent = `${formatNombre.format(poidsHevea)} kg`;
}

function afficherAchats() {
    const villageChoisi = filtreVillage.value;
    const optionVillage = [...filtreVillage.options].find(option => option.value === villageChoisi);
    selectionRegistre.textContent = optionVillage && villageChoisi
        ? `Registre du village : ${optionVillage.textContent}`
        : 'Vue générale de la coopérative';

    const liste = achatsFiltres().sort((a, b) => b.date.localeCompare(a.date));
    listeAchats.replaceChildren();
    messageListeVide.hidden = liste.length > 0;
    messageListeVide.textContent = achats.length > 0
        ? 'Aucun achat ne correspond aux filtres sélectionnés.'
        : 'Aucun achat enregistré pour le moment.';

    liste.forEach(achat => {
        const ligne = document.createElement('tr');
        creerCellule(ligne, new Date(achat.date).toLocaleDateString('fr-FR'));
        creerCellule(ligne, achat.village);
        creerCellule(ligne, `${achat.prenom} ${achat.nom}`);
        creerCellule(ligne, achat.telephone);
        creerCellule(ligne, NOMS_PRODUITS[achat.produit]);
        creerCellule(ligne, `${formatNombre.format(achat.poids)} kg`);
        creerCellule(ligne, formaterMontant(achat.montantPaye));

        const actions = document.createElement('td');
        actions.className = 'actions-cell';
        actions.append(
            creerBoutonAction('Voir les détails', 'fa-eye', 'view-action', () => afficherDetails(achat)),
            creerBoutonAction('Modifier cet achat', 'fa-pen', 'edit-action', () => commencerModification(achat)),
            creerBoutonAction('Imprimer le reçu', 'fa-receipt', 'receipt-action', () => imprimerRecu(achat)),
            creerBoutonAction('Supprimer cet achat', 'fa-trash', 'delete-action', () => supprimerAchat(achat.id))
        );
        ligne.appendChild(actions);
        listeAchats.appendChild(ligne);
    });

    const achatsDuVillage = achats.filter(achat => (
        !villageChoisi || cleVillage(achat.village) === villageChoisi
    ));
    mettreAJourStatistiques(achatsDuVillage);
    afficherDernieresOperations(achatsDuVillage.sort((a, b) => b.date.localeCompare(a.date)));
}

function commencerModification(achat) {
    idEnModification = achat.id;
    formulaire.elements.village.value = SOUS_VILLAGES.find(village => cleVillage(village) === cleVillage(achat.village)) || '';
    formulaire.elements.nom.value = achat.nom;
    formulaire.elements.prenom.value = achat.prenom;
    formulaire.elements.telephone.value = achat.telephone;
    formulaire.elements.produit.value = achat.produit;
    formulaire.elements.poids.value = achat.poids;
    formulaire.elements.montantPaye.value = achat.montantPaye;
    document.getElementById('form-title').innerHTML = '<i class="fa-solid fa-pen"></i> Modifier l’achat';
    boutonSoumission.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Enregistrer les modifications';
    boutonAnnulerModification.hidden = false;
    afficherRecapitulatif();
    formulaire.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function annulerModification() {
    idEnModification = null;
    formulaire.reset();
    document.getElementById('form-title').innerHTML = '<i class="fa-solid fa-user-plus"></i> Nouvel achat';
    boutonSoumission.innerHTML = '<i class="fa-solid fa-plus"></i> Enregistrer l’achat';
    boutonAnnulerModification.hidden = true;
    mettreAJourMontant();
}

function supprimerAchat(id) {
    const achat = achats.find(element => element.id === id);
    if (!achat || !window.confirm(`Supprimer l'achat de ${achat.prenom} ${achat.nom} à ${achat.village} ?`)) return;

    const avant = achats;
    achats = achats.filter(element => element.id !== id);
    if (!sauvegarderAchats()) {
        achats = avant;
        return;
    }
    mettreAJourVillages();
    afficherMessage('Achat supprimé.', 'success');
    afficherAchats();
}

function echapperHtml(valeur) {
    return String(valeur).replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere]);
}

function imprimerRecu(achat) {
    const fenetre = window.open('', '_blank', 'width=700,height=800');
    if (!fenetre) {
        afficherMessage('La fenêtre du reçu a été bloquée. Autorisez les fenêtres pop-up pour imprimer.', 'error');
        return;
    }
    const lignes = [
        ['Coopérative', 'Sanhoukro'],
        ['Village', achat.village],
        ['Date', new Date(achat.date).toLocaleString('fr-FR')],
        ['Producteur', `${achat.prenom} ${achat.nom}`],
        ['Téléphone', achat.telephone],
        ['Produit', NOMS_PRODUITS[achat.produit]],
        ['Poids', `${formatNombre.format(achat.poids)} kg`],
        ['Montant payé', formaterMontant(achat.montantPaye)]
    ].map(([titre, valeur]) => `<tr><th>${echapperHtml(titre)}</th><td>${echapperHtml(valeur)}</td></tr>`).join('');
    fenetre.document.write(`<!doctype html><html lang="fr"><meta charset="utf-8"><title>Reçu d’achat</title><style>body{font:16px Arial,sans-serif;max-width:700px;margin:40px auto;color:#203027}h1{color:#238b45}table{width:100%;border-collapse:collapse;margin:24px 0}th,td{text-align:left;padding:12px;border-bottom:1px solid #ddd}th{width:35%}.signature{margin-top:60px}@media print{button{display:none}}</style><h1>AgriTrade Sanhoukro</h1><h2>Reçu d’achat</h2><table>${lignes}</table><p>Signature du responsable : ____________________</p><button onclick="window.print()">Imprimer le reçu</button></html>`);
    fenetre.document.close();
}

function exporterCsv() {
    const lignes = [
        ['Date', 'Village', 'Nom', 'Prénom', 'Téléphone', 'Produit', 'Poids (kg)', 'Montant payé (FCFA)'],
        ...achatsFiltres().map(achat => [
            new Date(achat.date).toLocaleString('fr-FR'),
            achat.village,
            achat.nom,
            achat.prenom,
            achat.telephone,
            NOMS_PRODUITS[achat.produit],
            achat.poids,
            achat.montantPaye
        ])
    ];
    const csv = '\uFEFF' + lignes.map(ligne => ligne
        .map(valeur => {
            const texte = String(valeur);
            const securise = /^[\s]*[=+\-@]/.test(texte) ? `'${texte}` : texte;
            return `"${securise.replace(/"/g, '""')}"`;
        })
        .join(';'))
        .join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = 'registre-achats-sanhoukro.csv';
    lien.click();
    URL.revokeObjectURL(url);
}

champProduit.addEventListener('change', mettreAJourMontant);
champPoids.addEventListener('input', mettreAJourMontant);
champMontant.addEventListener('input', afficherRecapitulatif);
[champRecherche, filtreVillage, filtreProduit, dateDebut, dateFin].forEach(champ => {
    champ.addEventListener('input', afficherAchats);
    champ.addEventListener('change', afficherAchats);
});

document.getElementById('effacer-filtres').addEventListener('click', () => {
    champRecherche.value = '';
    filtreVillage.value = '';
    filtreProduit.value = '';
    dateDebut.value = '';
    dateFin.value = '';
    afficherAchats();
});
document.getElementById('exporter-csv').addEventListener('click', exporterCsv);
document.getElementById('imprimer-registre').addEventListener('click', () => window.print());
document.getElementById('vider-formulaire').addEventListener('click', annulerModification);
boutonAnnulerModification.addEventListener('click', annulerModification);
document.getElementById('fermer-details').addEventListener('click', () => detailsDialog.close());
document.getElementById('imprimer-recu').addEventListener('click', () => {
    if (achatEnCoursDeRecu) imprimerRecu(achatEnCoursDeRecu);
});

formulaire.addEventListener('reset', () => {
    window.setTimeout(() => {
        if (idEnModification) annulerModification();
        else afficherRecapitulatif();
    });
});

formulaire.addEventListener('submit', event => {
    event.preventDefault();
    if (!formulaire.reportValidity()) return;

    const donnees = new FormData(formulaire);
    const village = String(donnees.get('village')).trim();
    const nom = String(donnees.get('nom')).trim();
    const prenom = String(donnees.get('prenom')).trim();
    const telephone = String(donnees.get('telephone')).trim();
    const produit = String(donnees.get('produit'));
    const poids = Number(donnees.get('poids'));
    const montantPaye = Number(donnees.get('montantPaye'));

    if (!SOUS_VILLAGES.some(item => cleVillage(item) === cleVillage(village))
        || !nom || !prenom || !telephone
        || !Object.prototype.hasOwnProperty.call(PRIX_PAR_PRODUIT, produit)
        || !Number.isFinite(poids) || poids <= 0
        || !Number.isFinite(montantPaye) || montantPaye < 0) {
        afficherMessage('Vérifiez les informations et sélectionnez un sous-village valide.', 'error');
        return;
    }

    const achat = {
        id: idEnModification || (window.crypto && typeof window.crypto.randomUUID === 'function'
            ? window.crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`),
        village,
        nom,
        prenom,
        telephone,
        produit,
        poids,
        montantPaye,
        date: idEnModification
            ? achats.find(element => element.id === idEnModification).date
            : new Date().toISOString()
    };
    const confirmation = `${idEnModification ? 'Confirmer la modification' : 'Confirmer l’enregistrement'} :\n${prenom} ${nom} — ${village}\n${NOMS_PRODUITS[produit]}, ${formatNombre.format(poids)} kg\nMontant payé : ${formaterMontant(montantPaye)}`;
    if (!window.confirm(confirmation)) return;

    const avant = achats;
    const etaitModification = Boolean(idEnModification);
    if (etaitModification) {
        achats = achats.map(element => element.id === idEnModification ? achat : element);
    } else {
        achats = [achat, ...achats];
    }
    if (!sauvegarderAchats()) {
        achats = avant;
        return;
    }

    annulerModification();
    mettreAJourVillages();
    filtreVillage.value = cleVillage(village);
    champRecherche.value = '';
    afficherMessage(etaitModification ? 'Achat modifié et sauvegardé sur cet appareil.' : 'Achat enregistré et sauvegardé sur cet appareil.', 'success');
    afficherAchats();
});

document.getElementById('imprimer-registre').setAttribute('title', 'Imprimer le registre avec les filtres sélectionnés');
document.getElementById('tarifs-form').addEventListener('submit', event => {
    event.preventDefault();
    const prixCacao = Number(document.getElementById('prix-cacao-saisie').value);
    const prixHevea = Number(document.getElementById('prix-hevea-saisie').value);
    const date = document.getElementById('date-prix-saisie').value;
    if (!Number.isSafeInteger(prixCacao) || prixCacao <= 0
        || !Number.isSafeInteger(prixHevea) || prixHevea <= 0
        || !date) {
        afficherMessageTarifs('Saisissez des prix entiers positifs et la date d’application.', 'error');
        return;
    }
    if (!window.confirm(`Confirmer les tarifs gouvernementaux à compter du ${new Date(`${date}T00:00:00`).toLocaleDateString('fr-FR')} ?\nCacao : ${formaterMontant(prixCacao)}/kg\nHévéa : ${formaterMontant(prixHevea)}/kg`)) return;

    try {
        localStorage.setItem(TARIFS_STORAGE_KEY, JSON.stringify({
            prix: { cacao: prixCacao, hevea: prixHevea },
            date
        }));
        PRIX_PAR_PRODUIT.cacao = prixCacao;
        PRIX_PAR_PRODUIT.hevea = prixHevea;
        dateInitialeDesTarifs = date;
        afficherTarifs();
        mettreAJourMontant();
        afficherMessageTarifs('Tarifs enregistrés dans ce navigateur. Les nouveaux montants s’appliquent aux prochains achats.', 'success');
    } catch (erreur) {
        afficherMessageTarifs(`Impossible de sauvegarder les tarifs : ${erreur.message}`, 'error');
    }
});

document.getElementById('date-prix-saisie').value = dateInitialeDesTarifs;
mettreAJourMontant();
afficherTarifs();
mettreAJourVillages();
afficherAchats();
