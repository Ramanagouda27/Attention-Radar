import { useState } from 'react';
import { extractYouTubeId } from '../utils/youtube';

export default function YouTubeInput({ onLoad, isLoading }) {
  const [url, setUrl]     = useState('');
  const [error, setError] = useState('');

  const handleLoad = () => {
    setError('');
    const id = extractYouTubeId(url);
    if (!id) {
      setError('Could not find a YouTube video ID. Try: https://www.youtube.com/watch?v=VIDEO_ID');
      return;
    }
    onLoad(id);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') handleLoad();
  };

  return (
    <div className="yt-input-section">
      <div className="yt-input-row">
        <input
          type="text"
          className={`yt-input${error ? ' error' : ''}`}
          placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          value={url}
          onChange={e => { setUrl(e.target.value); setError(''); }}
          onKeyDown={handleKey}
          disabled={isLoading}
        />
        <button
          className="btn primary"
          onClick={handleLoad}
          disabled={isLoading || !url.trim()}
        >
          {isLoading ? 'Loading…' : 'Load'}
        </button>
      </div>
      {error && <p className="yt-error">{error}</p>}
    </div>
  );
}