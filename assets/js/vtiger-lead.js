/**
 * Debass Technologies — aide à la création de leads Vtiger CRM.
 *
 * Toutes les pages du site (principal + domaine LIANA ERP) doivent utiliser
 * cette fonction plutôt que de poster directement vers l'API webform Vtiger :
 * le jeton public (publicid) ne doit plus jamais apparaître dans le JS client.
 *
 * La fonction serverless /api/submit-lead vit sur le domaine principal ;
 * ce fichier fonctionne donc aussi bien en same-origin (site principal)
 * qu'en cross-origin via CORS (site LIANA ERP).
 */
(function (window) {
  var ENDPOINT = 'https://debasstechnologies.com/api/submit-lead';

  window.submitVtigerLead = function (fields) {
    // fields attendus : { nom, email, telephone, entreprise, message, leadsource, website }
    // "website" est le champ honeypot — doit rester un input caché, jamais rempli par un humain.
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok || !data.ok) {
          var err = new Error(data.why || 'submit_failed');
          err.code = data.why;
          throw err;
        }
        return data;
      });
    });
  };
})(window);
