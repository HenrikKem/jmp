import { PrivacyNotices } from '../../utils/privacy';
import './PrivacyInfo.css';

/**
 * PrivacyInfo Component
 *
 * Displays privacy information and GDPR compliance details.
 * Can be embedded in other components or shown as a standalone section.
 */
function PrivacyInfo({ variant = 'full' }) {
  if (variant === 'notice') {
    return (
      <div className="privacy-notice">
        <span className="privacy-icon">🔒</span>
        <span className="privacy-text">{PrivacyNotices.PROFILE_EDIT}</span>
      </div>
    );
  }

  if (variant === 'registration') {
    return (
      <div className="privacy-notice compact">
        <span className="privacy-icon">🔒</span>
        <span className="privacy-text">{PrivacyNotices.REGISTRATION}</span>
      </div>
    );
  }

  // Full privacy information panel
  return (
    <div className="privacy-info-panel">
      <h3>🔒 Datenschutz & DSGVO</h3>

      <section className="privacy-section">
        <h4>Ihre Rechte</h4>
        <ul>
          <li>
            <strong>Auskunftsrecht (Art. 15):</strong> {PrivacyNotices.DATA_EXPORT}
          </li>
          <li>
            <strong>Recht auf Löschung (Art. 17):</strong> {PrivacyNotices.DATA_DELETION}
          </li>
          <li>
            <strong>Berichtigung (Art. 16):</strong> Sie können Ihre Daten jederzeit im Profil bearbeiten.
          </li>
          <li>
            <strong>Datenübertragbarkeit (Art. 20):</strong> Sie können Ihre Daten in einem maschinenlesbaren Format exportieren.
          </li>
        </ul>
      </section>

      <section className="privacy-section">
        <h4>Datenverarbeitung</h4>
        <div className="data-categories">
          <div className="data-category">
            <span className="category-label">Stammdaten</span>
            <span className="category-items">Name, E-Mail, Telefon</span>
            <span className="category-purpose">Kommunikation & Identifikation</span>
          </div>
          <div className="data-category">
            <span className="category-label">Adressdaten</span>
            <span className="category-items">Straße, PLZ, Ort</span>
            <span className="category-purpose">Postalische Kommunikation</span>
          </div>
          <div className="data-category">
            <span className="category-label">Mitgliedsdaten</span>
            <span className="category-items">Organisationseinheiten, Rollen</span>
            <span className="category-purpose">Berechtigungen & Zuordnung</span>
          </div>
          <div className="data-category">
            <span className="category-label">Eventdaten</span>
            <span className="category-items">Anmeldungen, Gruppen, Event-Rollen</span>
            <span className="category-purpose">Eventorganisation</span>
          </div>
        </div>
      </section>

      <section className="privacy-section">
        <h4>Datensichtbarkeit</h4>
        <p className="visibility-intro">
          Ihre Daten werden nur für berechtigte Zwecke angezeigt:
        </p>
        <table className="visibility-table">
          <thead>
            <tr>
              <th>Wer sieht was?</th>
              <th>Name</th>
              <th>E-Mail</th>
              <th>Telefon</th>
              <th>Adresse</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Sie selbst</td>
              <td className="visible">✓</td>
              <td className="visible">✓</td>
              <td className="visible">✓</td>
              <td className="visible">✓</td>
            </tr>
            <tr>
              <td>Organizer (Ihr Scope)</td>
              <td className="visible">✓</td>
              <td className="visible">✓</td>
              <td className="visible">✓</td>
              <td className="partial">Ort</td>
            </tr>
            <tr>
              <td>Andere Mitglieder</td>
              <td className="visible">✓</td>
              <td className="visible">✓</td>
              <td className="hidden">–</td>
              <td className="hidden">–</td>
            </tr>
            <tr>
              <td>Event-Teilnehmer</td>
              <td className="visible">✓</td>
              <td className="hidden">–</td>
              <td className="hidden">–</td>
              <td className="hidden">–</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="privacy-section">
        <h4>Audit-Protokollierung</h4>
        <p>
          Folgende Aktionen werden zu Sicherheits- und Nachweiszwecken protokolliert:
        </p>
        <ul className="audit-list">
          <li>Profil-Änderungen</li>
          <li>Event-Anmeldungen und -Abmeldungen</li>
          <li>Rollenzuweisungen</li>
          <li>Administrative Zugriffe</li>
          <li>Datenexporte</li>
        </ul>
        <p className="audit-note">
          Audit-Logs werden für 10 Jahre aufbewahrt (gesetzliche Aufbewahrungspflicht).
        </p>
      </section>
    </div>
  );
}

export default PrivacyInfo;
