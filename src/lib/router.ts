// A tiny router: the part of the address after "#" decides which screen shows, e.g. #/routines.
// Hash addresses work on GitHub Pages with no server setup, and keep deep links possible later (D11).

import { useEffect, useState } from 'react';

export function currentPath() {
  return location.hash.replace(/^#/, '') || '/today';
}

export function useRoute() {
  const [path, setPath] = useState(currentPath);
  useEffect(() => {
    const onChange = () => setPath(currentPath());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return path;
}

export function navigate(path: string) {
  location.hash = path;
}
