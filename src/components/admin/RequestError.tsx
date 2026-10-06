'use client';

import { AdminApiError } from '@/lib/admin-api';
import { labels } from './labels';

export default function RequestError({ error, onRetry, onSignOut }: { error: AdminApiError; onRetry?: () => void; onSignOut?: () => void }) {
  if (error.kind === 'forbidden') {
    return (
      <div className="admin-error" role="alert">
        <p>{labels.forbidden}</p>
        {onSignOut && (
          <button className="btn btn-line btn-sm" type="button" onClick={onSignOut}>
            {labels.signOut}
          </button>
        )}
      </div>
    );
  }
  if (error.kind === 'rate-limited') {
    return (
      <div className="admin-error" role="alert">
        <p>{labels.rateLimited}</p>
      </div>
    );
  }
  if (error.kind === 'invalid') {
    return (
      <div className="admin-error" role="alert">
        <ul>
          {error.details.length > 0 ? error.details.map((d) => <li key={d}>{d}</li>) : <li>{labels.serverError}</li>}
        </ul>
        {onRetry && (
          <button className="btn btn-line btn-sm" type="button" onClick={onRetry}>
            {labels.retry}
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="admin-error" role="alert">
      <p>{labels.serverError}</p>
      {onRetry && (
        <button className="btn btn-line btn-sm" type="button" onClick={onRetry}>
          {labels.retry}
        </button>
      )}
    </div>
  );
}
