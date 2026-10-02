import { Component, type ReactNode } from 'react';

/** Filet de sécurité : une erreur d'affichage ne laisse pas un écran blanc. La progression (IndexedDB) n'est pas touchée. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { erreur: Error | null }> {
  state = { erreur: null as Error | null };

  static getDerivedStateFromError(erreur: Error) {
    return { erreur };
  }

  render() {
    if (!this.state.erreur) return this.props.children;
    return (
      <div className="screen narrow" role="alert">
        <h1>Un problème est survenu</h1>
        <p>L'affichage a rencontré une erreur. Votre progression est conservée dans ce navigateur.</p>
        <p>
          <button type="button" className="primary" onClick={() => window.location.reload()}>
            Recharger
          </button>{' '}
          <a href="#/choix" onClick={() => this.setState({ erreur: null })}>
            Revenir à l'accueil
          </a>
        </p>
        <details>
          <summary>Détail technique</summary>
          <pre className="small">{this.state.erreur.message}</pre>
        </details>
      </div>
    );
  }
}
